import axios from 'axios';
import { importPaperFiles, getImportBatches } from './bulkPaperImportApi';
jest.mock('axios');
beforeEach(() => { jest.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); });
test('sends only PDF form fields and separately authenticated uploader identity', async () => {
  sessionStorage.setItem('adminToken', 'admin-session'); localStorage.setItem('token', 'user-session');
  axios.post.mockResolvedValue({ data: { batchId: 'batch' } });
  const paper = new File(['%PDF'], 'paper.pdf', { type: 'application/pdf' });
  await importPaperFiles([paper], [], jest.fn());
  const [url, form, options] = axios.post.mock.calls[0];
  expect(url).toMatch(/\/api\/admin\/upload\/bulk$/); expect(Array.from(form.keys())).toEqual(['papers']);
  expect(options.headers).toEqual({ Authorization: 'Bearer admin-session', 'X-User-Authorization': 'Bearer user-session' });
  expect(form.get('papers').name).toBe('paper.pdf');
});
test('anonymous admin sessions omit secondary identity and include optional solutions', async () => {
  axios.post.mockResolvedValue({ data: {} });
  const file = new File(['%PDF'], 'x.pdf', { type: 'application/pdf' });
  await importPaperFiles([file], [file]);
  expect(Array.from(axios.post.mock.calls[0][1].keys())).toEqual(['papers', 'solutions']);
  expect(axios.post.mock.calls[0][2].headers['X-User-Authorization']).toBeUndefined();
});
test('older batch history uses a server cursor', async () => {
  axios.get.mockResolvedValue({ data: { batches: [] } });
  await getImportBatches('last-batch'); expect(axios.get.mock.calls[0][1].params).toEqual({ after: 'last-batch' });
});
