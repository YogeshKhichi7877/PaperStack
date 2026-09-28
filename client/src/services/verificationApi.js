import axios from 'axios';
import { API_URL } from '../config/appConfig';
import { authHeader } from './authHeaders';

export async function getVerificationQueue(params = {}) {
  const response = await axios.get(`${API_URL}/api/verification/queue`, { params });
  return response.data;
}

export async function getPaperVerification(paperId) {
  const response = await axios.get(`${API_URL}/api/verification/papers/${paperId}`);
  return response.data;
}

export async function submitPaperVerification(paperId, payload) {
  const response = await axios.post(
    `${API_URL}/api/verification/papers/${paperId}`,
    payload,
    { headers: authHeader() }
  );
  return response.data;
}
