function isSrvDnsError(error) {
  return /querySrv|queryTxt|ENOTFOUND|EAI_AGAIN|ETIMEOUT|ECONNREFUSED|DNS/i.test(
    String(error?.message || error?.code || '')
  );
}

async function resolveStandardUriWithHttps(srvUri, request = fetch) {
  const parsed = new URL(srvUri);
  const hostname = parsed.hostname.toLowerCase();
  const parentDomain = hostname.split('.').slice(1).join('.');
  if (!hostname || !parentDomain || !parsed.username || !parsed.password) {
    throw new Error('MongoDB SRV URI is incomplete');
  }

  const lookup = new URL('https://dns.google/resolve');
  lookup.searchParams.set('name', `_mongodb._tcp.${hostname}`);
  lookup.searchParams.set('type', 'SRV');
  const response = await request(lookup, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`MongoDB HTTPS DNS lookup failed: HTTP ${response.status}`);
  const result = await response.json();
  if (result.Status !== 0 || !Array.isArray(result.Answer)) {
    throw new Error('MongoDB HTTPS DNS lookup returned no SRV records');
  }

  const hosts = result.Answer.filter((answer) => answer.type === 33).map((answer) => {
    const parts = String(answer.data || '').trim().split(/\s+/);
    const port = Number(parts[2]);
    const host = String(parts[3] || '').replace(/\.$/, '').toLowerCase();
    if (parts.length !== 4 || !Number.isInteger(port) || port < 1 || port > 65535
      || !/^[a-z0-9.-]+$/.test(host) || !host.endsWith(`.${parentDomain}`)) {
      throw new Error('MongoDB HTTPS DNS returned an invalid SRV target');
    }
    return `${host}:${port}`;
  });
  if (!hosts.length) throw new Error('MongoDB HTTPS DNS lookup returned no valid SRV targets');

  const params = new URLSearchParams(parsed.search);
  params.set('tls', 'true');
  if (!params.has('authSource')) params.set('authSource', 'admin');
  return `mongodb://${parsed.username}:${parsed.password}@${hosts.join(',')}${parsed.pathname || '/'}?${params}`;
}

async function connectDatabase(client, primaryUri, standardUri, options, request = fetch) {
  if (!primaryUri && !standardUri) {
    throw new Error('MONGODB_URI or MONGODB_URI_STANDARD is required');
  }

  if (!primaryUri) {
    await client.connect(standardUri, options);
    return 'standard';
  }

  try {
    await client.connect(primaryUri, options);
    return 'primary';
  } catch (error) {
    if (!primaryUri.startsWith('mongodb+srv://') || !isSrvDnsError(error)) {
      throw error;
    }
    if (standardUri) {
      await client.connect(standardUri, options);
      return 'standard';
    }
    const resolvedUri = await resolveStandardUriWithHttps(primaryUri, request);
    await client.connect(resolvedUri, options);
    return 'https-dns-fallback';
  }
}

function requireDatabase(connection) {
  return (req, res, next) => {
    if (req.method === 'OPTIONS' || req.path === '/health' || connection.readyState === 1) {
      return next();
    }
    res.set('Retry-After', '5');
    return res.status(503).json({
      error: 'Database temporarily unavailable. Please try again shortly.',
      code: 'DATABASE_UNAVAILABLE',
    });
  };
}

module.exports = { connectDatabase, isSrvDnsError, requireDatabase, resolveStandardUriWithHttps };
