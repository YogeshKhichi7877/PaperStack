import axios from 'axios';

import {
  API_URL,
} from '../config/appConfig';
import { authHeader } from './authHeaders';
import { cachedPublicRequest } from './publicRequestCache';

export async function getMockExamSubjects() {
  return cachedPublicRequest('mock-exams:subjects', async () => {
    const response = await axios.get(`${API_URL}/api/mock-exams/subjects`);
    return response.data;
  });
}

export async function generateMockExam(
  payload
) {
  const response =
    await axios.post(
      `${API_URL}/api/mock-exams/generate`,
      payload,
      { headers: authHeader(), timeout: 90_000 }
    );

  return response.data;
}

export async function regenerateMockQuestion(payload) {
  const response = await axios.post(`${API_URL}/api/mock-exams/regenerate-question`, payload, {
    headers: authHeader(),
    timeout: 60_000,
  });
  return response.data;
}
