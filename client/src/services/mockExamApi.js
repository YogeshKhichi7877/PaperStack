import axios from 'axios';

import {
  API_URL,
} from '../config/appConfig';
import { authHeader } from './authHeaders';

export async function getMockExamSubjects() {
  const response =
    await axios.get(
      `${API_URL}/api/mock-exams/subjects`
    );

  return response.data;
}

export async function generateMockExam(
  payload
) {
  const response =
    await axios.post(
      `${API_URL}/api/mock-exams/generate`,
      payload,
      { headers: authHeader() }
    );

  return response.data;
}

export async function regenerateMockQuestion(payload) {
  const response = await axios.post(`${API_URL}/api/mock-exams/regenerate-question`, payload, { headers: authHeader() });
  return response.data;
}
