const resolved = new Map();
const pending = new Map();

export function cachedPublicRequest(key, loader, ttlMs = 5 * 60 * 1000) {
  const now = Date.now();
  const cached = resolved.get(key);

  if (cached && cached.expiresAt > now) {
    return Promise.resolve(cached.value);
  }

  if (cached) resolved.delete(key);
  if (pending.has(key)) return pending.get(key);

  const request = Promise.resolve()
    .then(loader)
    .then((value) => {
      resolved.set(key, {
        value,
        expiresAt: Date.now() + Math.max(1000, Number(ttlMs) || 0),
      });
      return value;
    })
    .finally(() => {
      pending.delete(key);
    });

  pending.set(key, request);
  return request;
}

export function clearPublicRequestCache(key = '') {
  if (key) {
    resolved.delete(key);
    pending.delete(key);
    return;
  }

  resolved.clear();
  pending.clear();
}
