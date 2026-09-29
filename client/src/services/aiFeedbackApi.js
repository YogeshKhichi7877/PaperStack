import axios from 'axios';
import { API_URL } from '../config/appConfig';
import { authHeader } from './authHeaders';

export async function submitAiFeedback(answerId, value, reason = '') {
  const response = await axios.post(`${API_URL}/api/ai-feedback`, { answerId, value, reason }, { headers: authHeader() });
  return response.data;
}
