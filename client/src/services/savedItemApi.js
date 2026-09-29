import axios from 'axios';
import { API_URL } from '../config/appConfig';
import { authHeader } from './authHeaders';

let cachedItems = null;
let pending = null;

export async function getSavedItems({ refresh = false } = {}) {
  if (!localStorage.getItem('token')) return [];
  if (!refresh && cachedItems) return cachedItems;
  if (!refresh && pending) return pending;
  pending = axios.get(`${API_URL}/api/saved-items`, { headers: authHeader() })
    .then((response) => {
      cachedItems = response.data?.items || [];
      return cachedItems;
    })
    .finally(() => { pending = null; });
  return pending;
}

export async function saveItem(item) {
  const response = await axios.post(`${API_URL}/api/saved-items`, item, { headers: authHeader() });
  cachedItems = [response.data.item, ...(cachedItems || []).filter((saved) => !(saved.entityType === item.entityType && saved.entityKey === String(item.entityId || item.entityKey)))];
  return response.data.item;
}

export async function removeSavedItem(entityType, entityKey) {
  await axios.delete(`${API_URL}/api/saved-items/${encodeURIComponent(entityType)}/${encodeURIComponent(entityKey)}`, { headers: authHeader() });
  cachedItems = (cachedItems || []).filter((saved) => !(saved.entityType === entityType && saved.entityKey === String(entityKey)));
}
