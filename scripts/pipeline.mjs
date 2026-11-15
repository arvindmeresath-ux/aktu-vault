import fs from 'fs';
import path from 'path';

const VAULT_PATH = path.resolve('public/vault_data.json');
const INBOX_PATH = path.resolve('inbox/raw_links.txt');

const BRANCH_META = {
  cse: { code: 'cse', name: '[1] CSE', pattern: /\b(CSE|KCS|BCS|DS|AI|ML|COA|OS|DBMS|DAA|COMPILER|PYTHON|JAVA|DATA\s*STRUCTURE)\b/i },
  ece: { code: 'ece', name: '[2] ECE', pattern: /\b(ECE|KEC|BEC|DSP|DIGITAL\s*SIGNAL|VLSI|EMBEDDED|COMMUNICATION|ANTENNA|INTEGRATED\s*CIRCUIT|MICROPROCESSOR)\b/i },
  ee:  { code: 'ee',  name: '[3] EE',  pattern: /\b(EE|KEE|BEE|CONTROL\s*SYSTEM|POWER|MACHINE|INSTRUMENTATION|INDUSTRIAL\s*AUTOMATION|BEE-053)\b/i },
  me:  { code: 'me',  name: '[4] ME',  pattern: /\b(ME|KME|BME|THERMO|FLUID|MANUFACTURING|CAD|SOM|MECHANICAL)\b/i },
  ce:  { code: 'ce',  name: '[5] CE',  pattern: /\b(CE|KCE|BCE|STRUCTURAL|SURVEY|GEOTECH|HYDROLOGY|CIVIL)\b/i },
  it:  { code: 'it',  name: '[6] IT',  pattern: /\b(IT|KIT|BIT|WEB|CLOUD|CYBER|INFORMATION\s*TECH)\b/i },
};

const YEARS_TEMPLATE = {
  '1ST_YEAR': { id: '1ST_YEAR', name: '[1] 1st Year (1ST_YEAR)', subtitle: 'Common to all (Sem 1 & 2)' },
  '2ND_YEAR': { id: '2ND_YEAR', name: '[2] 2nd Year (2ND_YEAR)', subtitle: 'Core Basics (Sem 3 & 4)' },
  '3RD_YEAR': { id: '3RD_YEAR', name: '[3] 3rd Year (3RD_YEAR)', subtitle: 'Core & Electives (Sem 5 & 6)' },
  '4TH_YEAR': { id: '4TH_YEAR', name: '[4] 4th Year (4TH_YEAR)', subtitle: 'Final Year & Electives (Sem 7 & 8)' },
};

function detectBranch(text) {
  for (const [key, meta] of Object.entries(BRANCH_META)) {
    if (meta.pattern.test(text)) return key;
  }
  return 'cse';
}

function detectYearAndSem(text) {
  if (/\b(sem\s*1|101|102|103|104|105)\b/i.test(text)) return { year: '1ST_YEAR', sem: 1 };
  if (/\b(sem\s*2|201|202|203|204|205|1st\s*year)\b/i.test(text)) return { year: '1ST_YEAR', sem: 2 };
  if (/\b(sem\s*3|301|302|303|304|305)\b/i.test(text)) return { year: '2ND_YEAR', sem: 3 };
  if (/\b(sem\s*4|401|402|403|404|405|2nd\s*year)\b/i.test(text)) return { year: '2ND_YEAR', sem: 4 };
  if (/\b(sem\s*5|501|502|503|053|control\s*system|dsp|integrated\s*circuit|microprocessor)\b/i.test(text)) return { year: '3RD_YEAR', sem: 5 };
  if (/\b(sem\s*6|601|602|603|3rd\s*year)\b/i.test(text)) return { year: '3RD_YEAR', sem: 6 };
  if (/\b(sem\s*7|701|702)\b/i.test(text)) return { year: '4TH_YEAR', sem: 7 };
  return { year: '4TH_YEAR', sem: 8 };
}

function detectCategory(text) {
  if (/\b(pyq|previous\s*year|question\s*paper|202[0-6])\b/i.test(text)) return 'PYQs';
  if (/\b(quantum|important|imp\s*q|question\s*bank)\b/i.test(text)) return 'Quantum';
  if (/\b(syllabus)\b/i.test(text)) return 'Syllabus';
  return 'Notes';
}

function extractSubjectName(title) {
  const cleaned = title
    .replace(/\.pdf$/i, '')
    .replace(/\b(unit[-\s]*\d+|u[-\s]*\d+|one\s*shot|notes|pyq|quantum|important|questions|202\d)\b/gi, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'General Archive';
}

function runPipeline() {
  const vault = fs.existsSync(VAULT_PATH)
    ? JSON.parse(fs.readFileSync(VAULT_PATH, 'utf-8'))
    : {};

  // Index all existing URLs for strict deduplication
  const existingUrls = new Set();
  for (const branchObj of Object.values(vault)) {
    for (const yrObj of Object.values(branchObj?.years || {})) {
      for (const subObj of Object.values(yrObj?.subjects || {})) {
        for (const f of subObj?.files || []) {
          if (f?.url) existingUrls.add(f.url.trim());
        }
      }
    }
  }

  let addedCount = 0;
  let skippedCount = 0;

  if (fs.existsSync(INBOX_PATH)) {
    const lines = fs.readFileSync(INBOX_PATH, 'utf-8').split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      let title = '';
      let url = '';
      if (line.includes('|')) {
        [title, url] = line.split('|').map((s) => s.trim());
      } else {
        url = line;
        try {
          title = decodeURIComponent(path.basename(new URL(url).pathname)).replace(/\.pdf$/i, '');
        } catch {
          title = 'Document';
        }
      }

      if (!/^https?:\/\//i.test(url) || /(youtube\.com|youtu\.be|t\.me|instagram\.com)/i.test(url)) {
        skippedCount++;
        continue;
      }

      if (existingUrls.has(url)) {
        skippedCount++;
        continue;
      }

      const branchKey = detectBranch(`${title} ${url}`);
      const { year, sem } = detectYearAndSem(`${title} ${url}`);
      const category = detectCategory(`${title} ${url}`);
      const subjectName = extractSubjectName(title);

      vault[branchKey] ??= {
        code: branchKey,
        name: BRANCH_META[branchKey].name,
        years: {},
      };

      vault[branchKey].years[year] ??= {
        ...YEARS_TEMPLATE[year],
        subjects: {},
        totalFiles: 0,
        badge: '0 FILES',
      };

      vault[branchKey].years[year].subjects[subjectName] ??= {
        name: subjectName,
        files: [],
      };

      vault[branchKey].years[year].subjects[subjectName].files.push({
        title,
        category,
        sem,
        url,
      });

      existingUrls.add(url);
      addedCount++;
    }
  }

  // Recalculate totalFiles & badge counters across every branch & year
  let grandTotal = 0;
  for (const branchObj of Object.values(vault)) {
    for (const yrObj of Object.values(branchObj?.years || {})) {
      let yrFiles = 0;
      for (const subObj of Object.values(yrObj?.subjects || {})) {
        yrFiles += Array.isArray(subObj?.files) ? subObj.files.length : 0;
      }
      yrObj.totalFiles = yrFiles;
      yrObj.badge = `${yrFiles} FILES`;
      grandTotal += yrFiles;
    }
  }

  fs.writeFileSync(VAULT_PATH, JSON.stringify(vault, null, 2), 'utf-8');
  console.log(`[✓] Vault Pipeline Complete: +${addedCount} added, ${skippedCount} skipped/duplicate, ${grandTotal} total active PDFs.`);
}

runPipeline();