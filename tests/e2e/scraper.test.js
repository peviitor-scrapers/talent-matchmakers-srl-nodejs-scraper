import { jest } from '@jest/globals';
import { readFileSync } from 'fs';
import path from 'path';

const mockFetch = jest.fn();

jest.unstable_mockModule('node-fetch', () => ({
  default: mockFetch
}));

describe('E2E Tests: Scraper Flow', () => {
  const itIfApi = process.env.SOLR_AUTH ? it : it.skip;

  itIfApi('should verify company data in SOLR', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, total: 1, count: 1, data: [
        { id: '38460545', company: 'TALENT MATCHMAKERS S.R.L.', status: 'activ', location: ['Cluj-Napoca'] }
      ] })
    });

    const res = await fetch('https://api.peviitor.ro/v1/scraper/jobs/?cif=38460545', {
      headers: { 'User-Agent': 'job_seeker_ro_spider' }
    });
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.total).toBeGreaterThanOrEqual(1);
  });
});
