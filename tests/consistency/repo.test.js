import { existsSync, readdirSync, readFileSync } from 'fs';
import path from 'path';

describe('Consistency Tests', () => {
  const root = process.cwd();

  test('README.md exists', () => {
    expect(existsSync(path.join(root, 'README.md'))).toBe(true);
  });

  test('package.json exists with correct main', () => {
    const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
    expect(pkg.main).toBe('scraper/index.js');
    expect(pkg.scripts.scrape).toContain('scraper/index.js');
  });

  test('scraper directory structure is correct', () => {
    const scraperDir = path.join(root, 'scraper');
    expect(existsSync(scraperDir)).toBe(true);
    expect(existsSync(path.join(scraperDir, 'index.js'))).toBe(true);
    expect(existsSync(path.join(scraperDir, 'api.js'))).toBe(true);
    expect(existsSync(path.join(scraperDir, 'anaf.js'))).toBe(true);
    expect(existsSync(path.join(scraperDir, 'company.js'))).toBe(true);
    expect(existsSync(path.join(scraperDir, 'config', 'company.json'))).toBe(true);
  });

  test('old root files are deleted', () => {
    expect(existsSync(path.join(root, 'index.js'))).toBe(false);
    expect(existsSync(path.join(root, 'company.js'))).toBe(false);
    expect(existsSync(path.join(root, 'solr.js'))).toBe(false);
    expect(existsSync(path.join(root, 'demoanaf.js'))).toBe(false);
    expect(existsSync(path.join(root, 'validate-jobs.js'))).toBe(false);
  });

  test('no SOLR_AUTH in workflow files', () => {
    const workflowDir = path.join(root, '.github', 'workflows');
    if (!existsSync(workflowDir)) return;

    const files = readdirSync(workflowDir).filter(f => f.endsWith('.yml'));
    for (const file of files) {
      const content = readFileSync(path.join(workflowDir, file), 'utf8');
      expect(content).not.toMatch(/SOLR_AUTH/);
    }
  });

  test('no SOLR_AUTH or solr.peviitor.ro in package.json scripts', () => {
    const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
    const scripts = pkg.scripts || {};
    for (const [key, value] of Object.entries(scripts)) {
      expect(value).not.toMatch(/SOLR_AUTH/);
      expect(value).not.toMatch(/solr\.peviitor\.ro/);
    }
  });
});
