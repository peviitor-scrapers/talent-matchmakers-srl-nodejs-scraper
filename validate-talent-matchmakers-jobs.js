import { readFileSync } from 'fs';
import { validateByHead, validateByContent } from './scraper/job-validator.js';
import { querySOLR, upsertJobs } from './scraper/api.js';

const companyConfig = JSON.parse(readFileSync('scraper/config/company.json', 'utf8'));
const CIF = companyConfig.id;
const COMPANY = companyConfig.company;
const SOLR_AUTH = process.env.SOLR_AUTH;

async function getJobsByCIF(cif) {
  const result = await querySOLR(cif);
  return result.docs || [];
}

async function deleteJob(url) {
  const { default: fetch } = await import('node-fetch');
  const res = await fetch('https://api.peviitor.ro/v1/scraper/jobs/delete/', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'job_seeker_ro_spider',
    },
    body: JSON.stringify({ url })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Failed to delete job: ${res.status}`);
  return data;
}

async function main() {
  console.log(`\n🔍 CI Job Validation for ${COMPANY} (CIF: ${CIF})\n`);

  try {
    const jobs = await getJobsByCIF(CIF);
    console.log(`📊 Found ${jobs.length} jobs in SOLR for CIF ${CIF}\n`);

    let allValid = true;
    const jobsToDelete = [];

    for (const job of jobs) {
      const url = job.url;
      console.log(`🔗 Checking: ${url}`);

      let isUp = await validateByHead(url);
      if (isUp === null) {
        console.log(`   ⚠️  HEAD failed, trying GET...`);
        isUp = await validateByContent(url);
      }

      if (isUp === false) {
        console.log(`   ❌ Job is DOWN — marking for deletion`);
        jobsToDelete.push(url);
        allValid = false;
      } else {
        console.log(`   ✅ Job is UP`);
      }
    }

    if (jobsToDelete.length > 0) {
      console.log(`\n🗑️  Removing ${jobsToDelete.length} dead jobs...`);
      for (const url of jobsToDelete) {
        try {
          await deleteJob(url);
          console.log(`   Deleted: ${url}`);
        } catch (err) {
          console.error(`   Failed to delete ${url}: ${err.message}`);
        }
      }

      console.log(`\n🔄 Verifying after cleanup...`);
      const remaining = await getJobsByCIF(CIF);
      console.log(`📊 Remaining jobs: ${remaining.length}`);
    }

    if (allValid) {
      console.log(`\n✅ All ${jobs.length} jobs are alive. CI PASSED.\n`);
      process.exit(0);
    } else {
      console.log(`\n⚠️  ${jobsToDelete.length} jobs removed. CI PASSED (cleanup done).\n`);
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ CI Validation Error:', error.message);
    process.exit(1);
  }
}

main();
