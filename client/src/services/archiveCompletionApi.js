import axios from 'axios';
import { API_URL } from '../config/appConfig';

export async function getArchiveCompletion() {
  const response = await axios.get(`${API_URL}/api/archive-completion`);
  return response.data;
}
