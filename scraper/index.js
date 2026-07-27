import fetch from "node-fetch";
import fs from "fs";
import * as cheerio from "cheerio";
import { fileURLToPath } from "url";
import { validateAndGetCompany } from "./company.js";
import { querySOLR, deleteJobByUrl, upsertJobs, upsertCompany } from "./api.js";
import { generateJobsMarkdown } from "./markdown-generator.js";
import companyConfig from "./config/company.js";

const COMPANY_ID = companyConfig.id;
const JOB_BASE = "https://jobs.talentmatchmakers.co";
const CAREER_URL = companyConfig.career[0];

let COMPANY_NAME = null;

async function fetchJobsHtml() {
  const res = await fetch(CAREER_URL, {
    headers: {
      "User-Agent": "job_seeker_ro_spider",
      "Accept": "text/html"
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${CAREER_URL}`);
  return res.text();
}

function parseHtmlJobs(html) {
  const $ = cheerio.load(html);
  const jobs = [];

  $("#jobs_list_container > li").each((_, el) => {
    const $li = $(el);
    const linkEl = $li.find("a[data-turbo='false']");
    const href = linkEl.attr("href") || "";
    const title = linkEl.text().trim();
    if (!title) return;

    const url = href.startsWith("http") ? href : `${JOB_BASE}${href}`;

    const spans = $li.find("span.text-base > span").map((_, span) => $(span).text().trim()).get();

    let workmode = "hybrid";
    const location = [];

    for (const span of spans) {
      const lower = span.toLowerCase();
      if (lower === "fully remote" || lower === "remote") {
        workmode = "remote";
      } else if (lower === "hybrid") {
        workmode = "hybrid";
      } else if (lower === "on-site" || lower === "on site") {
        workmode = "on-site";
      } else if (span !== "·" && span !== "Software Engineering" && !lower.includes("engineering")) {
        const clean = span.replace(/^[,;·\s]+|[,;·\s]+$/g, "").trim();
        if (clean) location.push(clean);
      }
    }

    if (location.length === 0) location.push(companyConfig.location[0]);

    jobs.push({ url, title, workmode, location, tags: [] });
  });

  return { jobs, total: jobs.length };
}

async function scrapeAllListings() {
  console.log(`Fetching ${CAREER_URL}`);
  const html = await fetchJobsHtml();
  const { jobs, total } = parseHtmlJobs(html);

  console.log(`Found ${total} jobs on the page`);

  const seen = new Set();
  const unique = [];
  for (const job of jobs) {
    if (!seen.has(job.url)) {
      seen.add(job.url);
      unique.push(job);
    }
  }

  console.log(`Total unique jobs collected: ${unique.length}`);
  return unique;
}

function mapToJobModel(rawJob, cif, companyName = COMPANY_NAME) {
  const now = new Date().toISOString();

  const job = {
    url: rawJob.url,
    title: rawJob.title,
    company: companyName,
    cif: cif,
    location: rawJob.location?.length ? rawJob.location : undefined,
    tags: rawJob.tags?.length ? rawJob.tags : undefined,
    workmode: rawJob.workmode || undefined,
    date: now,
    status: "scraped"
  };

  Object.keys(job).forEach((k) => job[k] === undefined && delete job[k]);

  return job;
}

function transformJobsForSOLR(payload) {
  const romanianCities = [
    'Bucharest', 'București', 'Cluj-Napoca', 'Cluj Napoca',
    'Timișoara', 'Timisoara', 'Iași', 'Iasi', 'Brașov', 'Brasov',
    'Constanța', 'Constanta', 'Craiova', 'Bacău', 'Sibiu',
    'Târgu Mureș', 'Targu Mures', 'Oradea', 'Baia Mare', 'Satu Mare',
    'Ploiești', 'Ploiesti', 'Pitești', 'Pitesti', 'Arad', 'Galați', 'Galati',
    'Brăila', 'Braila', 'Drobeta-Turnu Severin', 'Râmnicu Vâlcea', 'Ramnicu Valcea',
    'Buzău', 'Buzau', 'Botoșani', 'Botosani', 'Zalău', 'Zalau', 'Hunedoara', 'Deva',
    'Suceava', 'Bistrița', 'Bistrita', 'Tulcea', 'Călărași', 'Calarasi',
    'Giurgiu', 'Alba Iulia', 'Slatina', 'Piatra Neamț', 'Piatra Neamt', 'Roman',
    'Dumbrăvița', 'Dumbravita', 'Voluntari', 'Popești-Leordeni', 'Popesti-Leordeni',
    'Chitila', 'Mogoșoaia', 'Mogosoaia', 'Otopeni'
  ];

  const citySet = new Set(romanianCities.map(c => c.toLowerCase()));

  const normalizeWorkmode = (wm) => {
    if (!wm) return undefined;
    const lower = wm.toLowerCase();
    if (lower.includes('remote')) return 'remote';
    if (lower.includes('office') || lower.includes('on-site') || lower.includes('site')) return 'on-site';
    return 'hybrid';
  };

  const transformed = {
    ...payload,
    company: payload.company?.toUpperCase(),
    jobs: payload.jobs.map(job => {
      const validLocations = (job.location || []).filter(loc => {
        const lower = loc.toLowerCase().trim();
        if (lower === 'romania' || lower === 'românia') return true;
        return citySet.has(lower);
      }).map(loc => loc.toLowerCase() === 'romania' ? 'România' : loc);

      return {
        ...job,
        location: validLocations.length > 0 ? validLocations : ['România'],
        workmode: normalizeWorkmode(job.workmode)
      };
    })
  };

  return transformed;
}

async function main() {
  try {
    fs.mkdirSync("scraper", { recursive: true });

    console.log("=== Step 1: Get existing jobs count ===");
    const existingResult = await querySOLR(COMPANY_ID);
    const existingCount = existingResult.numFound;
    console.log(`Found ${existingCount} existing jobs in SOLR`);

    console.log("=== Step 2: Validate company via ANAF ===");
    const { company, cif, address } = await validateAndGetCompany();
    COMPANY_NAME = company;
    const localCif = cif;

    try {
      await upsertCompany({
        id: cif,
        company,
        brand: companyConfig.brand || undefined,
        status: "activ",
        location: address ? [address] : companyConfig.location,
        website: companyConfig.website,
        career: companyConfig.career,
        scraperFile: companyConfig.scraperFile,
        lastScraped: new Date().toISOString().split('T')[0]
      });
    } catch (err) {
      console.log(`Note: Could not upsert company to SOLR core: ${err.message}`);
    }

    const rawJobs = await scrapeAllListings();
    const scrapedCount = rawJobs.length;
    console.log(`Jobs scraped from Talent Matchmakers website: ${scrapedCount}`);

    console.log("=== Step 3: Remove expired jobs from SOLR ===");
    const scrapedUrls = new Set(rawJobs.map(j => j.url));
    if (scrapedUrls.size > 0) {
      const existingJobsResult = await querySOLR(COMPANY_ID);
      const existingJobs = existingJobsResult.docs || [];
      const expiredUrls = existingJobs
        .filter(j => !scrapedUrls.has(j.url))
        .map(j => j.url);
      if (expiredUrls.length > 0) {
        console.log(`⚠️ ${expiredUrls.length} jobs no longer on careers page - deleting from SOLR...`);
        for (const url of expiredUrls) {
          await deleteJobByUrl(url);
        }
        console.log(`✅ Deleted ${expiredUrls.length} expired jobs`);
      } else {
        console.log("✅ No expired jobs to remove");
      }
    }

    const jobs = rawJobs.map(job => mapToJobModel(job, localCif));

    const payload = {
      source: "jobs.talentmatchmakers.co",
      scrapedAt: new Date().toISOString(),
      company: COMPANY_NAME,
      cif: localCif,
      jobs
    };

    console.log("Transforming jobs for SOLR...");
    const transformedPayload = transformJobsForSOLR(payload);
    const validCount = transformedPayload.jobs.filter(j => j.location).length;
    console.log(`Jobs with valid Romanian locations: ${validCount}`);

    fs.writeFileSync("scraper/jobs.json", JSON.stringify(transformedPayload, null, 2), "utf-8");
    console.log("Saved scraper/jobs.json");

    const companyData = {
      id: localCif,
      company: transformedPayload.company,
      brand: companyConfig.brand || undefined,
      status: "activ",
      location: address ? [address] : companyConfig.location,
      website: companyConfig.website,
      career: companyConfig.career,
      lastScraped: new Date().toISOString().split('T')[0]
    };
    const markdown = generateJobsMarkdown(companyData, transformedPayload.jobs);
    fs.mkdirSync("docs", { recursive: true });
    fs.writeFileSync("docs/jobs.md", markdown, "utf-8");
    console.log("Saved docs/jobs.md");

    fs.copyFileSync("scraper/config/company.json", "docs/company.json");
    console.log("Copied scraper/config/company.json → docs/company.json");

    console.log("\n=== Step 4: Upsert jobs to SOLR ===");
    await upsertJobs(transformedPayload.jobs);

    const finalResult = await querySOLR(COMPANY_ID);
    console.log(`\n=== SUMMARY ===`);
    console.log(`Jobs existing in SOLR before scrape: ${existingCount}`);
    console.log(`Jobs scraped from Talent Matchmakers website: ${scrapedCount}`);
    console.log(`Jobs in SOLR after scrape: ${finalResult.numFound}`);
    console.log(`====================`);

    console.log("\n=== DONE ===");
    console.log("Scraper completed successfully!");

  } catch (err) {
    console.error("Scraper failed:", err);
    process.exit(1);
  }
}

export { parseHtmlJobs, mapToJobModel, transformJobsForSOLR };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
