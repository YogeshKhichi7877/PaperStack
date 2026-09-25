import axios from 'axios';
import { API_URL } from '../config/appConfig';
import { authHeader } from './authHeaders';

export async function getContributorLeaderboard() {
  const response = await axios.get(`${API_URL}/api/contributors/leaderboard`);
  return Array.isArray(response.data) ? response.data : [];
}

export async function getContributorProfile(contributorId) {
  const response = await axios.get(`${API_URL}/api/contributors/${encodeURIComponent(contributorId)}/profile`);
  return response.data;
}

export async function getMyContributorProfile() {
  const response = await axios.get(`${API_URL}/api/contributors/me/profile`, {
    headers: authHeader(),
  });
  return response.data;
}

export async function getContributorXpRules() {
  const response = await axios.get(`${API_URL}/api/contributors/rules`);
  return response.data;
}
