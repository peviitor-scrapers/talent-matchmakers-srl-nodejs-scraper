# AGENTS.md — Rules for AI agents

## Project
Talent Matchmakers scraper for peviitor.ro (Node.js, ESM, Jest)

## 🌱 This Repo Is a Derived Scraper
This repo is **derived from** [job_seeker_ro_spider](https://github.com/sebiboga/epam-systems-international-srl-nodejs-scraper) — the EPAM template that is the reference implementation for the peviitor.ro ecosystem. When making changes:
- **All company-specific identity lives in `config/company.json`** (CIF, brand, legalName, URLs). Read from `config/company.js` in Node code, or via `jq` in workflows. Never hardcode in source files.
- **The Talent Matchmakers-specific scraping logic is in `index.js`** (`fetchJobsHtml`, `parseHtmlJobs`). Uses Teamtailor HTML + cheerio (no API), single-page. The output shape (`mapToJobModel`, `transformJobsForSOLR`) is inherited from the template and must NOT change — that's what keeps SOLR uniform across derived scrapers.
- **Structural changes** (pipeline, caching, tests architecture) should be discussed upstream in the EPAM template repo first, so all derivatives benefit.

## Critical Rules

### 1. Temporary Files
All temporary/scratch files MUST go in `tmp/` inside the project root.
NEVER use paths outside the project.

### 2. Issues & GitHub
- **Orice modificare de cod trebuie să aibă un issue în GitHub Issues** (vezi [ISSUES.md](ISSUES.md))
- Excepții: typo-uri, whitespace, documentație minoră
- Create a GitHub issue before implementing any change
- Commit messages must reference the issue they close
- Never commit credentials (`.env.local`, `*.pem`, etc.)
- Push after commit

### 3. Environment Variables
- All operations go through `api.peviitor.ro/v1` — no direct SOLR access, no `SOLR_AUTH` needed
- Consistency tests need `GITHUB_REPOSITORY` (format: `owner/repo`) and `GITHUB_TOKEN`

### 4. Testing
```bash
# All tests
npm test

# Unit tests (no env vars needed)
npm run test:unit

# Integration tests (ANAF public API, SOLR conditional)
npm run test:integration

# E2E tests (real Talent Matchmakers website, SOLR conditional)
npm run test:e2e

# Consistency tests (GitHub repo config — needs GITHUB_REPOSITORY + GITHUB_TOKEN)
npm run test:consistency
```

### 5. ESM + Jest
- Use `jest.unstable_mockModule` (NOT `jest.mock`) for mocking ESM modules
- Run with `--experimental-vm-modules` flag
- SOLR tests use conditional `itIfSolr` helper — auto-skip when `SOLR_AUTH` not set

### 6. Verification
- După orice modificare, urmează [VERIFY.md](VERIFY.md) pas cu pas
- Ultimul pas = rulează scraperul prin GitHub Actions, verifică job-urile în SOLR, și verifică că `docs/jobs.md` a fost generat și este accesibil pe GitHub Pages
- Toate workflow-urile din `.github/workflows/` trebuie să treacă înainte de merge

### 7. Module Structure
- `scraper/config/company.json` + `scraper/config/company.js` — single source of truth for company identity
- `scraper/anaf.js` — ANAF API core module (imported by company.js); exports getCompanyFromANAF, getCompanyFromANAFWithFallback, searchCompany
- `scraper/markdown-generator.js` — generates `docs/jobs.md` after each scrape; called from index.js
- `scraper/job-validator.js` — shared `validateByHead` + `validateByContent` + `validateByBrowser` used by both validator CLIs
- `scraper/demoanaf.js` — CLI wrapper around scraper/anaf.js
- `scraper/company.js` — company validation (ANAF + Peviitor); reads from `scraper/config/company.json`, writes `scraper/anaf-cache.json` for offline fallback
- `scraper/api.js` — Peviitor API operations (query, upsert, delete) — no direct SOLR access
- `scraper/validate-jobs.js` — manual deep validator (content-aware); thin wrapper over scraper/job-validator.js
- `tests/validate-talent-matchmakers-jobs.js` — CI fast validator (HEAD only); thin wrapper over scraper/job-validator.js + scraper/api.js
- `scraper/index.js` — main scraper orchestrator

### 8. Caching Behavior
- `scraper/anaf-cache.json` — ANAF raw data for offline fallback (gitignored)
- `scraper/config/company.json` — single source of truth; `lastScraped` refreshed every 7 days (configurable via `CACHE_MAX_AGE_DAYS` in company.js)
- If ANAF is unreachable AND cache is stale, the code falls back to the stale cache rather than failing the scrape
- `docs/company.json` is regenerated on every scrape so GitHub Pages can read company identity

### 9. Maintenance Agent
See [MAINTENANCE.md](MAINTENANCE.md) for the full maintenance workflow.

**On every session:**
1. Check open GitHub issues: `gh issue list --repo sebiboga/talent-matchmakers-srl-nodejs-scraper --state open`
2. Prioritize: `critical` → `bug` → `enhancement` → `documentation`
3. Fix all issues, commit with `#issue` reference, close the issue
