import { jest } from '@jest/globals';
import fs from 'fs';

const mockFetch = jest.fn();

jest.unstable_mockModule('node-fetch', () => ({
  default: mockFetch
}));

const ANAF_CACHE_PATH = 'scraper/anaf-cache.json';
const CONFIG_JSON_PATH = 'scraper/config/company.json';

function snapshotFile(path) {
  if (!fs.existsSync(path)) return null;
  return fs.readFileSync(path, 'utf-8');
}

function restoreFile(path, snapshot) {
  if (snapshot !== null) {
    fs.writeFileSync(path, snapshot, 'utf-8');
  } else if (fs.existsSync(path)) {
    fs.unlinkSync(path);
  }
}

function clearAnafCache() {
  if (fs.existsSync(ANAF_CACHE_PATH)) fs.unlinkSync(ANAF_CACHE_PATH);
}

function anafCompanyResponse(data) {
  return {
    ok: true,
    json: async () => ({ data, success: true })
  };
}

function peviitorResponse(companies) {
  return {
    ok: true,
    json: async () => ({ success: true, data: companies })
  };
}

function solrResponse(total, data) {
  return {
    ok: true,
    json: async () => ({ total, data })
  };
}

function errorResponse(status) {
  return {
    ok: false,
    status,
    text: async () => 'Error'
  };
}

const TALENT_ANAF_RECORD = {
  cui: 38460545,
  name: 'TALENT MATCHMAKERS S.R.L.',
  address: 'CLUJ-NAPOCA',
  caenCode: '7021',
  inactive: false,
  vatRegistered: true,
  eFacturaRegistered: false,
  headquartersAddress: { locality: 'Cluj-Napoca' }
};

describe('company.js', () => {
  let company;
  let anafCacheSnapshot;
  let configSnapshot;

  beforeAll(async () => {
    company = await import('../../scraper/company.js');
    anafCacheSnapshot = snapshotFile(ANAF_CACHE_PATH);
    configSnapshot = snapshotFile(CONFIG_JSON_PATH);
  });

  afterAll(() => {
    restoreFile(ANAF_CACHE_PATH, anafCacheSnapshot);
    restoreFile(CONFIG_JSON_PATH, configSnapshot);
  });

  beforeEach(() => {
    mockFetch.mockReset();
    clearAnafCache();
  });

  describe('getCompanyData (no cache)', () => {
    it('should fetch TALENT MATCHMAKERS via direct CIF lookup and return company data', async () => {
      mockFetch.mockResolvedValueOnce(anafCompanyResponse(TALENT_ANAF_RECORD));

      const result = await company.getCompanyData();

      expect(result).toHaveProperty('company', 'TALENT MATCHMAKERS S.R.L.');
      expect(result).toHaveProperty('cif', '38460545');
      expect(result).toHaveProperty('active', true);
      expect(result).toHaveProperty('anafData');
      expect(result.anafData.name).toBe('TALENT MATCHMAKERS S.R.L.');
    });

    it('should fall back to company config when ANAF returns no data', async () => {
      mockFetch.mockResolvedValueOnce(anafCompanyResponse(null));

      const result = await company.getCompanyData();

      expect(result).toEqual({
        company: 'TALENT MATCHMAKERS S.R.L.',
        cif: '38460545',
        active: true,
        anafData: null
      });
    });

    it('should fall back to company config when ANAF returns no company name', async () => {
      mockFetch.mockResolvedValueOnce(anafCompanyResponse({ cui: 38460545, name: null }));

      const result = await company.getCompanyData();

      expect(result).toEqual({
        company: 'TALENT MATCHMAKERS S.R.L.',
        cif: '38460545',
        active: true,
        anafData: null
      });
    });

    it('should fall back to stale config when ANAF and CUIScan are unreachable', async () => {
      mockFetch.mockResolvedValue(errorResponse(500));

      const result = await company.getCompanyData();

      expect(result).toHaveProperty('company', 'TALENT MATCHMAKERS S.R.L.');
      expect(result).toHaveProperty('cif', '38460545');
      expect(result).toHaveProperty('active', true);
    });
  });

  describe('validateAndGetCompany', () => {
    afterEach(() => {
      clearAnafCache();
    });

    it('should return company data with status active', async () => {
      mockFetch
        .mockResolvedValueOnce(anafCompanyResponse(TALENT_ANAF_RECORD))
        .mockResolvedValueOnce(solrResponse(5, [
          { url: 'https://jobs.talentmatchmakers.co/jobs/1', title: 'Job 1' },
          { url: 'https://jobs.talentmatchmakers.co/jobs/2', title: 'Job 2' }
        ]))
        .mockResolvedValueOnce(peviitorResponse([{ company: 'TALENT MATCHMAKERS S.R.L.' }]));

      const result = await company.validateAndGetCompany();

      expect(result).toHaveProperty('status', 'active');
      expect(result).toHaveProperty('company', 'TALENT MATCHMAKERS S.R.L.');
      expect(result).toHaveProperty('cif', '38460545');
      expect(result).toHaveProperty('existingJobsCount');
      expect(typeof result.existingJobsCount).toBe('number');
    });
  });
});
