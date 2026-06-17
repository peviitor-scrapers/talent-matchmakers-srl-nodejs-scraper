# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
