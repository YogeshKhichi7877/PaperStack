import axios from 'axios';

import { API_URL } from '../config/appConfig';
import { cachedPublicRequest } from './publicRequestCache';

function stableParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params)
      .filter(([, value]) => value !== '' && value !== null && value !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
  );
}

export function getPublicPapers(params = {}) {
  const normalized = stableParams(params);
  const key = `papers:${JSON.stringify(normalized)}`;

  return cachedPublicRequest(key, async () => {
    const response = await axios.get(`${API_URL}/api/papers`, { params: normalized });
    return response.data;
  }, 30_000);
}

export function getPublicAnalytics() {
  return cachedPublicRequest('papers:analytics', async () => {
    const response = await axios.get(`${API_URL}/api/analytics`);
    return response.data;
  }, 60_000);
}
