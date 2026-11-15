// Automatic Parser for public/vault_data.txt
export async function fetchVaultData() {
  try {
    const res = await fetch('/vault_data.txt?v=' + Date.now());
    if (!res.ok) throw new Error('Failed to load vault_data.txt');
    const text = await res.text();
    return parseVaultTxt(text);
  } catch (err) {
    console.error('Error fetching vault data:', err);
    return null;
  }
}

export function parseVaultTxt(txt) {
  const branches = {};

  const lines = txt.split('\n');
  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) return;

    // Split by pipe '|'
    const parts = line.split('|').map((p) => p.trim());
    if (parts.length < 4) return;

    const [branch, year, subject, title, url = '#'] = parts;
    const branchKey = branch.toLowerCase();

    if (!branches[branchKey]) {
      branches[branchKey] = {
        code: branchKey,
        name: `[${branchKey.toUpperCase()}]`,
        years: {}
      };
    }

    if (!branches[branchKey].years[year]) {
      branches[branchKey].years[year] = {
        id: year,
        subjects: {}
      };
    }

    if (!branches[branchKey].years[year].subjects[subject]) {
      branches[branchKey].years[year].subjects[subject] = {
        name: subject,
        files: []
      };
    }

    branches[branchKey].years[year].subjects[subject].files.push({
      id: `${branchKey}-${year}-${subject}-${title}`.replace(/\s+/g, '-').toLowerCase(),
      title,
      url,
      type: title.toLowerCase().includes('quantum') ? 'QUANTUM' : 'NOTES',
      size: 'PDF'
    });
  });

  return branches;
}