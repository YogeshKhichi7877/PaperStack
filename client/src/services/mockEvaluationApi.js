import axios from 'axios';

import {
  API_URL,
} from '../config/appConfig';
import { authHeader } from './authHeaders';

export async function getMockEvaluationStatus() {
  const response = await axios.get(
    `${API_URL}/api/mock-evaluation/status`
  );

  return response.data;
}

export async function evaluateMockAnswers(payload) {
  const response = await axios.post(
    `${API_URL}/api/mock-evaluation/evaluate`,
    payload,
    { headers: authHeader() }
  );

  return response.data;
}
