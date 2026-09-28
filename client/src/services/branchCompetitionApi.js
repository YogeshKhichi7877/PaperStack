import axios from 'axios';

import {
  API_URL,
} from '../config/appConfig';

export async function getBranchCompetition(period = '30d') {
  const response = await axios.get(
    `${API_URL}/api/branch-competition`,
    {
      params: { period },
    }
  );

  return response.data;
}
