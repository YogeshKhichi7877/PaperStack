import axios from 'axios';

import {
  API_URL,
} from '../config/appConfig';
import { cachedPublicRequest } from './publicRequestCache';

export async function getRevisionSheetSubjects() {
  return cachedPublicRequest('revision-sheets:subjects', async () => {
    const response = await axios.get(`${API_URL}/api/revision-sheets/subjects`);
    return response.data;
  });
}

export async function getRevisionSheet(
  subjectCode,
  {
    examType = '',
    threshold = 72,
  } = {},
  options = {}
) {
  const response = await axios.get(
    `${API_URL}/api/revision-sheets/subject/${encodeURIComponent(subjectCode)}`,
    {
      params: {
        examType,
        threshold,
      },
      signal: options.signal,
      timeout: 60_000,
    }
  );

  return response.data;
}
