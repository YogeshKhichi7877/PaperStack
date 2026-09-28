import axios from 'axios';

import {
  API_URL,
} from '../config/appConfig';

export async function getTrending({
  period = '7d',
  branch = '',
  semester = '',
} = {}) {
  const response = await axios.get(
    `${API_URL}/api/trending`,
    {
      params: {
        period,
        branch,
        semester,
      },
    }
  );

  return response.data;
}
