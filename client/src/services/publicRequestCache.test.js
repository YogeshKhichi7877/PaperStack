import {
  cachedPublicRequest,
  clearPublicRequestCache,
} from './publicRequestCache';

beforeEach(() => clearPublicRequestCache());

test('deduplicates simultaneous public metadata requests', async () => {
  const loader = jest.fn().mockResolvedValue({ subjects: ['CS504'] });

  const [first, second] = await Promise.all([
    cachedPublicRequest('subjects', loader),
    cachedPublicRequest('subjects', loader),
  ]);

  expect(loader).toHaveBeenCalledTimes(1);
  expect(first).toBe(second);
});

test('does not cache failed requests', async () => {
  const loader = jest.fn()
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({ subjects: [] });

  await expect(cachedPublicRequest('subjects', loader)).rejects.toThrow('offline');
  await expect(cachedPublicRequest('subjects', loader)).resolves.toEqual({ subjects: [] });
  expect(loader).toHaveBeenCalledTimes(2);
});
