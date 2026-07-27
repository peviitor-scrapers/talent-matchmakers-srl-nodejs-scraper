import { jest } from '@jest/globals';

const mockFetch = jest.fn();

jest.unstable_mockModule('node-fetch', () => ({
  default: mockFetch
}));

describe('job-validator.js Component Tests', () => {
  let jobValidator;

  beforeAll(async () => {
    jobValidator = await import('../../scraper/job-validator.js');
  });

  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('validateByHead', () => {
    it('should return active status for HEAD 200', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK'
      });

      const result = await jobValidator.validateByHead('https://example.com/valid');

      expect(result).toHaveProperty('url', 'https://example.com/valid');
      expect(result).toHaveProperty('status', 'active');
      expect(result).toHaveProperty('httpStatus', 200);
      expect(result).toHaveProperty('error', null);
    });

    it('should return expired status for HEAD 404', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const result = await jobValidator.validateByHead('https://example.com/missing');

      expect(result).toHaveProperty('status', 'expired');
      expect(result).toHaveProperty('httpStatus', 404);
    });

    it('should return error status on network failure', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      const result = await jobValidator.validateByHead('https://example.com/error');

      expect(result).toHaveProperty('status', 'error');
      expect(result).toHaveProperty('httpStatus', 0);
      expect(result.error).toBe('Connection refused');
    });

    it('should include url in result', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      const result = await jobValidator.validateByHead('https://test.com/job');

      expect(result.url).toBe('https://test.com/job');
    });

    it('should set title to null for HEAD requests', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      const result = await jobValidator.validateByHead('https://test.com/job');

      expect(result.title).toBeNull();
    });
  });

  describe('validateByContent', () => {
    it('should return active for 200 with no expired keywords', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => '<html><head><title>Job</title></head><body>Apply now</body></html>'
      });

      const result = await jobValidator.validateByContent('https://example.com/page');

      expect(result).toHaveProperty('status', 'active');
      expect(result).toHaveProperty('httpStatus', 200);
      expect(result.title).toBe('Job');
    });

    it('should return expired for 200 with expired keywords in body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '<html><body>This position is no longer available</body></html>'
      });

      const result = await jobValidator.validateByContent('https://example.com/expired');

      expect(result).toHaveProperty('status', 'expired');
    });

    it('should return active for 404 with no expired keywords (checks body, not HTTP status)', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'Not Found'
      });

      const result = await jobValidator.validateByContent('https://example.com/missing');

      expect(result).toHaveProperty('status', 'active');
      expect(result).toHaveProperty('httpStatus', 404);
    });

    it('should return error on network failure', async () => {
      mockFetch.mockRejectedValue(new Error('Timeout'));

      const result = await jobValidator.validateByContent('https://example.com/timeout');

      expect(result).toHaveProperty('status', 'error');
      expect(result.error).toBe('Timeout');
    });

    it('should extract title from HTML', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '<html><head><title>Senior Developer</title></head></html>'
      });

      const result = await jobValidator.validateByContent('https://test.com/job');

      expect(result.title).toBe('Senior Developer');
    });
  });
});
