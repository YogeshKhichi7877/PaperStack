import axios from 'axios';
import { API_URL } from '../config/appConfig';
import { cachedPublicRequest } from './publicRequestCache';

export async function getImportantTopicsSubjects() {
  return cachedPublicRequest('important-topics:subjects', async () => {
    const response = await axios.get(`${API_URL}/api/important-topics/subjects`);
    return response.data;
  });
}

export async function getImportantTopics(
  subjectCode,
  {
    threshold = 72,
    limit = 30,
  } = {},
  options = {}
) {
  const response = await axios.get(
    `${API_URL}/api/important-topics/subject/${encodeURIComponent(subjectCode)}`,
    {
      params: {
        threshold,
        limit,
      },
      signal: options.signal,
      timeout: 60_000,
    }
  );

  return response.data;
}
