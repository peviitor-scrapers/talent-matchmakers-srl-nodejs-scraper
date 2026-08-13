# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.2] - 2026-08-13

### Changed
- Aligned with EPAM template v1.5.2 (commit a3b9c83) — CHANGELOG-only cleanup, no code changes
- Unit tests made hermetic (closes #11): `tests/unit/company.test.js` and `tests/unit/demoanaf.test.js` rewritten to mock `node-fetch` instead of `anaf.js`, with snapshot/restore of cache files — no more date-dependent failures on stale `lastScraped`

## [1.5.1] - 2026-07-31

### Added
- Aligned with EPAM template v1.5.1 (commit ecad420)
- `scraper/job-validator.js`: added `validateByBrowser()` (Playwright headless Chromium, catches JS-rendered 404s) and new keyword `"the page you are looking for doesn't exist"`
- `tests/validate-talent-matchmakers-jobs.js`: multi-mode validator CLI (`--head`, `--content`, `--browser`, `--timeout`, `--dry-run`, `--delete`), moved from repo root to `tests/`
- `playwright` devDependency
- `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md` at repo root
- `ai/MAINTENANCE.md` (Maintenance Agent workflow)
- `.github/workflows/job-deep-validate.yml` (manual deep validation via Playwright)
- `tests/consistency/root-files.test.js`, `tests/consistency/version.test.js`

### Changed
- `package.json` version bumped from 1.1.0 → 1.5.1
- `docs/index.html`: reads `cfg.company` / `cfg.id` instead of legacy `cfg.legalName` / `cfg.cif`
- `scraper/anaf-cache.json` is now gitignored (no longer committed)
- `ai/AGENTS.md`, `ai/files.md`, `ai/company-model.md`: updated file inventory, scraperFile documented as GitHub Actions URL (not raw)

## [1.0.0] - 2026-06-17

### Added
- Initial release — derived from [job_seeker_ro_spider](https://github.com/sebiboga/epam-systems-international-srl-nodejs-scraper) template v1.4.3
- Job scraping from Talent Matchmakers Teamtailor careers page (HTML scraping with cheerio)
- Company validation via ANAF with 7-day caching and stale fallback
- SOLR integration for job and company storage
- GitHub Actions workflows for daily scraping and automated testing
- Comprehensive test suite (unit, integration, E2E, consistency)
- Markdown job listing generation (`docs/jobs.md`)
- Romanian location filtering and work mode normalization

## License

Copyright (c) 2024-2026 BOGA SEBASTIAN-NICOLAE
Licensed under MIT License
