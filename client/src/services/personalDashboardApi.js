import axios from 'axios';

import {
  API_URL,
} from '../config/appConfig';

import {
  authHeader,
} from './authHeaders';

export async function getPersonalDashboard() {
  const response = await axios.get(
    `${API_URL}/api/dashboard`,
    {
      headers: authHeader(),
    }
  );

  return response.data;
}

export async function updateProfile(displayName) {
  const response = await axios.patch(`${API_URL}/api/user/profile`, { displayName }, { headers: authHeader() });
  return response.data.user;
}

export async function uploadProfilePhoto(photo) {
  const form = new FormData();
  form.append('photo', photo);
  const response = await axios.post(`${API_URL}/api/user/profile/photo`, form, { headers: authHeader() });
  return response.data.user;
}

export async function linkGoogleAccount(credential) {
  const response = await axios.post(`${API_URL}/api/auth/google/link`, { credential }, { headers: authHeader() });
  return response.data.user;
}
