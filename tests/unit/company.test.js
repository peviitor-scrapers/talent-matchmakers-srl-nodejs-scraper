import { jest } from '@jest/globals';
import { existsSync } from 'fs';
import path from 'path';

const mockFetch = jest.fn();

jest.unstable_mockModule('node-fetch', () => ({
  default: mockFetch
}));

jest.unstable_mockModule('../../scraper/anaf.js', () => ({
  getCompanyFromANAF: jest.fn(),
  searchCompany: jest.fn()
}));

describe('company.js Component Tests', () => {
  let company;
  let anaf;

  beforeAll(async () => {
    company = await import('../../scraper/company.js');
    anaf = await import('../../scraper/anaf.js');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCompanyData', () => {
    it('should return company data with valid structure', async () => {
      const result = await company.getCompanyData();

      expect(result).toHaveProperty('company');
      expect(result).toHaveProperty('cif');
      expect(result).toHaveProperty('active');
    });

    it('should have correct CIF', async () => {
      const result = await company.getCompanyData();

      expect(result.cif).toBe('38460545');
    });

    it('should have correct company name uppercase', async () => {
      const result = await company.getCompanyData();

      expect(result.company).toBe('TALENT MATCHMAKERS S.R.L.');
    });

    it('should return active status as boolean', async () => {
      const result = await company.getCompanyData();

      expect(typeof result.active).toBe('boolean');
    });

    it('should have anafData property', async () => {
      const result = await company.getCompanyData();

      expect(result).toHaveProperty('anafData');
    });
  });

  describe('validateAndGetCompany', () => {
    it('should return result with status field', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, total: 0, count: 0, data: [] })
      });

      const result = await company.validateAndGetCompany();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('company');
      expect(result).toHaveProperty('cif');
      expect(result).toHaveProperty('existingJobsCount');
    });

    it('should have valid status value', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, total: 0, count: 0, data: [] })
      });

      const result = await company.validateAndGetCompany();

      expect(['active', 'inactive']).toContain(result.status);
    });
  });
});
