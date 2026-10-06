import axios from 'axios';
import { API_URL } from '../config/appConfig';
import { adminHeader, authHeader } from './authHeaders';
const root = `${API_URL}/api/admin/upload/bulk`;
export async function getBulkImportConfig() { return (await axios.get(`${root}/config`, { headers: adminHeader() })).data; }
export async function importPaperFiles(papers, solutions, onProgress) {
  const data = new FormData();
  papers.forEach((file) => data.append('papers', file));
  solutions.forEach((file) => data.append('solutions', file));
  const identity = authHeader().Authorization;
  return (await axios.post(root, data, { headers: { ...adminHeader(), ...(identity ? { 'X-User-Authorization': identity } : {}) },
    onUploadProgress: (event) => onProgress?.(event.total ? Math.min(100, Math.round(event.loaded / event.total * 100)) : null),
  })).data;
}
export async function getImportBatches(after) { return (await axios.get(`${root}/batches`, { headers: adminHeader(), params: after ? { after } : {} })).data; }
export async function getImportBatch(id) { return (await axios.get(`${root}/batches/${id}`, { headers: adminHeader() })).data; }
export async function getImportReview(id) { return (await axios.get(`${root}/papers/${id}/review`, { headers: adminHeader() })).data; }
export async function saveImportMetadata(id, body) { return (await axios.patch(`${root}/papers/${id}/metadata`, body, { headers: adminHeader() })).data; }
export async function approveImportQuestion(id, body) { return (await axios.patch(`${API_URL}/api/admin/moderation/questions/${id}`, body, { headers: adminHeader() })).data; }
export async function attachImportSolution(batchId, hash, paperId) { return (await axios.patch(`${root}/batches/${batchId}/solutions/${hash}`, { paperId }, { headers: adminHeader() })).data; }
