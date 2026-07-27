import { jest } from '@jest/globals';

const mockFetch = jest.fn();

jest.unstable_mockModule('node-fetch', () => ({
  default: mockFetch
}));

const itIfApi = process.env.SOLR_AUTH ? it : it.skip;

describe('Integration Tests: API Availability', () => {
  const API_BASE = 'https://api.peviitor.ro/v1';

  beforeAll(() => {
    if (!process.env.SOLR_AUTH) {
      console.log('ℹ️  SOLR_AUTH not set — all integration tests will be skipped');
      console.log('   To run: export SOLR_AUTH="<user>:<password>"');
    }
  });

  describe('Peviitor API', () => {
    itIfApi('should have peviitor API available', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, total: 0, count: 0, data: [] })
      });

      const res = await fetch(`${API_BASE}/scraper/jobs/?cif=38460545`, {
        headers: { 'User-Agent': 'job_seeker_ro_spider' }
      });

      expect(res.ok).toBe(true);
    });
  });
});

describe('Integration Tests: Company Data in SOLR', () => {
  const itIfApi = process.env.SOLR_AUTH ? it : it.skip;

  itIfApi('should find the correct CIF in SOLR', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, total: 1, count: 1, data: [
        { id: '38460545', company: 'TALENT MATCHMAKERS S.R.L.' }
      ] })
    });

    const res = await fetch('https://api.peviitor.ro/v1/scraper/jobs/?cif=38460545', {
      headers: { 'User-Agent': 'job_seeker_ro_spider' }
    });
    const data = await res.json();

    expect(data.data).toBeDefined();
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.total).toBeGreaterThanOrEqual(1);
  });
});
