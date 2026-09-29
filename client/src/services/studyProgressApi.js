import axios from 'axios';
import { API_URL } from '../config/appConfig';
import { authHeader } from './authHeaders';

export async function recordStudyProgress(item) {
  if (!localStorage.getItem('token')) return null;
  const response = await axios.post(`${API_URL}/api/study-progress`, item, { headers: authHeader() });
  return response.data?.item || null;
}

export async function recordStudyProgressOnce(item) {
  const key = `paperstack-study-progress:${item.entityType}:${item.entityId || item.entityKey}`;
  try {
    if (sessionStorage.getItem(key)) return null;
    sessionStorage.setItem(key, 'pending');
  } catch {}
  try {
    const result = await recordStudyProgress(item);
    try { sessionStorage.setItem(key, 'done'); } catch {}
    return result;
  } catch (error) {
    try { sessionStorage.removeItem(key); } catch {}
    throw error;
  }
}
