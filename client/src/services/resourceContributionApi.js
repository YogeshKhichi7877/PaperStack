import axios from 'axios';

import {
  API_URL,
} from '../config/appConfig';

import {
  authHeader,
} from './authHeaders';

export async function fetchResourceContributionConfig() {
  const response =
    await axios.get(
      `${API_URL}/api/resource-contributions/config`
    );

  return response.data;
}

export async function submitResourceContribution(
  formData
) {
  const response =
    await axios.post(
      `${API_URL}/api/resource-contributions`,
      formData,
      {
        headers:
          authHeader(),
      }
    );

  return response.data;
}

export async function fetchMyResourceContributions() {
  const response =
    await axios.get(
      `${API_URL}/api/resource-contributions/mine`,
      {
        headers:
          authHeader(),
      }
    );

  return response.data;
}
