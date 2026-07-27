# Robots.txt Analysis — Talent Matchmakers Careers (Teamtailor)

Sursa: https://jobs.talentmatchmakers.co/robots.txt

## Reguli

```
User-agent: aihitdata
Disallow: /

User-agent: *
Disallow: /app/
Disallow: /messages/
Disallow: /messenger/
Disallow: /facebook/tab/
Disallow: /jobs/internal/
Content-Signal: search=yes, ai-train=no, ai-input=yes

Sitemap: https://jobs.talentmatchmakers.co/sitemap.xml
```

## Interpretare

| Cale | Accesibil? | Ce conține |
|---|---|---|
| `/` | ✅ Da (pentru `*`) | Landing page |
| `/jobs/` | ✅ Da | Listări de job-uri — pagina pe care scraper-ul o accesează |
| `/jobs/{id}-{slug}` | ✅ Da | Paginile individuale de job |
| `/app/*` | ❌ Disallowed | Aplicația internă |
| `/messages/*` | ❌ Disallowed | Mesaje |
| `/jobs/internal/*` | ❌ Disallowed | Job-uri interne |
| `/` | ❌ **Disallowed** (pentru `aihitdata`) | Bot-ul aihitdata e complet blocat |

## Recomandare

robots.txt NU este legal binding, dar reprezintă intenția proprietarului site-ului.

- Căile `/jobs/` sunt **permise** pentru toți user-agent-ii obișnuiți — scraperul nostru este compliant.
- Paginile individuale de job (`/jobs/{id}-{slug}`) sunt și ele permise. Noi le verificăm accesibilitatea (HEAD request) în E2E tests.
- Scraperul curent face o singură cerere per pagină, cu delay rezonabil — comportament politicos.
- Sitemap-ul XML disponibil la `https://jobs.talentmatchmakers.co/sitemap.xml` poate fi folosit pentru descoperirea completă a job-urilor.

**Concluzie**: Risc minim. Site-ul e public, răspunde fără autentificare, iar scraperul e politicos (rate limiting, User-Agent standard `job_seeker_ro_spider`, o singură cerere simultană).
