import axios from 'axios';

import {
  API_URL,
} from '../config/appConfig';

import { trackProductEvent } from './productAnalyticsApi';

export async function searchPaperStack(
  params = {}
) {
  const response = await axios.get(
    `${API_URL}/api/search/v2`,
    {
      params,
    }
  );

  trackProductEvent(
    'search',
    {
      routeKey: 'search',
      type: params.type || 'all',
      branch: params.branch || '',
      semester: params.semester || '',
      examType: params.examType || '',
      resultCount: response.data?.counts?.returned ?? 0,
    }
  ).catch(() => {});

  return response.data;
}
