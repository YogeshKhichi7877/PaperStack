import axios from 'axios';
import { API_URL } from '../config/appConfig';
import { cachedPublicRequest } from './publicRequestCache';

export async function getPyqIntelligenceSubjects() {
  return cachedPublicRequest('pyq-intelligence:subjects', async () => {
    const response = await axios.get(`${API_URL}/api/pyq-intelligence/subjects`);
    return response.data;
  });
}

export async function getSubjectPyqIntelligence(subjectCode, threshold = 72, options = {}) {
  const response = await axios.get(
    `${API_URL}/api/pyq-intelligence/subject/${encodeURIComponent(subjectCode)}`,
    {
      params: { threshold },
      signal: options.signal,
      timeout: 60_000,
    }
  );
  return response.data;
}
