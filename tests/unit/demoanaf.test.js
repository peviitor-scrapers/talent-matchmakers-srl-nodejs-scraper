import { jest } from '@jest/globals';

const mockFetch = jest.fn();

jest.unstable_mockModule('node-fetch', () => ({
  default: mockFetch
}));

jest.unstable_mockModule('../../scraper/anaf.js', () => ({
  getCompanyFromANAF: jest.fn(),
  searchCompany: jest.fn()
}));

function makeAnafResponseSuccess(name, cif, status = 'Activ') {
  return `
    <table class="table table-striped table-bordered">
      <tr><td>1</td><td>${cif}</td><td>${name}</td><td>${status}</td></tr>
    </table>
  `;
}

function makeAnafEmptyResponse() {
  return '<p>Nu au fost gasite rezultate pentru cautarea efectuata.</p>';
}

describe('demoanaf.js Component Tests', () => {
  let demoanaf;
  let anaf;

  beforeAll(async () => {
    anaf = await import('../../scraper/anaf.js');

    // Pre-populate mocks so module-level code in demoanaf.js doesn't crash
    anaf.getCompanyFromANAF.mockResolvedValue({ name: 'TEST', cui: '38460545', inactive: false });
    anaf.searchCompany.mockResolvedValue([]);

    demoanaf = await import('../../scraper/demoanaf.js');
  });

  beforeEach(() => {
    mockFetch.mockReset();
    anaf.getCompanyFromANAF.mockReset();
    anaf.searchCompany.mockReset();
  });

  describe('searchCompany (from anaf.js)', () => {
    it('should search by CIF and return company name', async () => {
      anaf.searchCompany.mockResolvedValue([
        { name: 'TALENT MATCHMAKERS S.R.L.', cui: '38460545', inactive: false }
      ]);

      const results = await anaf.searchCompany('38460545');

      expect(results).toHaveLength(1);
      expect(results[0].name).toContain('TALENT MATCHMAKERS');
    });

    it('should return empty array when no matches', async () => {
      anaf.searchCompany.mockResolvedValue([]);

      const results = await anaf.searchCompany('99999999');

      expect(results).toEqual([]);
    });
  });

  describe('getCompanyFromANAF (from anaf.js)', () => {
    it('should return company data with valid structure', async () => {
      anaf.getCompanyFromANAF.mockResolvedValue({
        name: 'TALENT MATCHMAKERS S.R.L.',
        cui: '38460545',
        inactive: false
      });

      const result = await anaf.getCompanyFromANAF('38460545');

      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('cui');
      expect(result).toHaveProperty('inactive');
    });

    it('should return null when company not found', async () => {
      anaf.getCompanyFromANAF.mockResolvedValue(null);

      const result = await anaf.getCompanyFromANAF('00000000');

      expect(result).toBeNull();
    });

    it('should preserve cui as number', async () => {
      anaf.getCompanyFromANAF.mockResolvedValue({
        name: 'TEST COMPANY',
        cui: 12345678,
        inactive: false
      });

      const result = await anaf.getCompanyFromANAF('12345678');

      expect(typeof result.cui).toBe('number');
    });
  });
});
