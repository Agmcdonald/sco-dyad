export interface ParsedComicInfo {
  series: string | null;
  issue: string | null;
  year: number | null;
  volume: string | null;
  publisher?: string | null;
  ofTotal?: string | null; // New field for 'of #' total
}

// Character to publisher mapping
const characterPublisherMap: Record<string, string> = {
  // DC Comics characters
  'superman': 'DC Comics', 'batman': 'DC Comics', 'wonder woman': 'DC Comics', 'flash': 'DC Comics', 'green lantern': 'DC Comics', 'aquaman': 'DC Comics', 'cyborg': 'DC Comics', 'green arrow': 'DC Comics', 'martian manhunter': 'DC Comics', 'shazam': 'DC Comics', 'nightwing': 'DC Comics', 'robin': 'DC Comics', 'batgirl': 'DC Comics', 'supergirl': 'DC Comics', 'harley quinn': 'DC Comics', 'joker': 'DC Comics', 'catwoman': 'DC Comics', 'poison ivy': 'DC Comics', 'lex luthor': 'DC Comics', 'deathstroke': 'DC Comics', 'teen titans': 'DC Comics', 'justice league': 'DC Comics', 'birds of prey': 'DC Comics', 'suicide squad': 'DC Comics',
  // Marvel Comics characters
  'spider-man': 'Marvel Comics', 'spiderman': 'Marvel Comics', 'iron man': 'Marvel Comics', 'captain america': 'Marvel Comics', 'thor': 'Marvel Comics', 'hulk': 'Marvel Comics', 'black widow': 'Marvel Comics', 'hawkeye': 'Marvel Comics', 'ant-man': 'Marvel Comics', 'wasp': 'Marvel Comics', 'captain marvel': 'Marvel Comics', 'ms marvel': 'Marvel Comics', 'daredevil': 'Marvel Comics', 'punisher': 'Marvel Comics', 'deadpool': 'Marvel Comics', 'wolverine': 'Marvel Comics', 'x-men': 'Marvel Comics', 'fantastic four': 'Marvel Comics', 'avengers': 'Marvel Comics', 'guardians of the galaxy': 'Marvel Comics', 'doctor strange': 'Marvel Comics', 'scarlet witch': 'Marvel Comics', 'vision': 'Marvel Comics', 'falcon': 'Marvel Comics', 'winter soldier': 'Marvel Comics', 'black panther': 'Marvel Comics', 'storm': 'Marvel Comics', 'cyclops': 'Marvel Comics', 'jean grey': 'DC Comics', 'magneto': 'Marvel Comics', 'professor x': 'Marvel Comics', 'venom': 'Marvel Comics', 'carnage': 'Marvel Comics', 'green goblin': 'Marvel Comics', 'doctor octopus': 'Marvel Comics', 'thanos': 'Marvel Comics', 'loki': 'Marvel Comics', 'galactus': 'Marvel Comics',
};

// Patterns to remove common metadata that clutters series names
// Note: (of #) patterns are handled separately before these general patterns.
const metadataPatterns = [
    /\(digital\)/gi, /\(web-rip\)/gi, /\(webrip\)/gi, /\(scan\)/gi, /\(cbr\)/gi, /\(cbz\)/gi, /\(pdf\)/gi, /\([^)]*-[^)]*\)/gi, /\([^)]*rip[^)]*\)/gi, /\([^)]*scan[^)]*\)/gi, /\(dcp\)/gi, /\(empire\)/gi, /\(son of ultron-empire\)/gi, /\(the last kryptonian-dcp\)/gi, /\(\d+\s*covers?\)/gi, /\(annual\)/gi, /\(one-shot\)/gi,
    /\(GetComics\.INFO\)/gi, // Added to remove GetComics.INFO
    /\(Digital\)/gi, // Ensure this is also caught
];

const detectPublisherFromCharacters = (seriesName: string): string | null => {
  if (!seriesName) return null;
  const lowerSeries = seriesName.toLowerCase();
  for (const [character, publisher] of Object.entries(characterPublisherMap)) {
    if (lowerSeries.includes(character)) return publisher;
  }
  return null;
};

export const parseFilename = (path: string): ParsedComicInfo => {
  const filename = path.split(/[\\/]/).pop() || '';
  // Preserve hyphens for series names like "A-Force"
  let cleaned = filename.replace(/_/g, ' ').replace(/\.[^/.]+$/, "").trim();

  // 0. Extract "of Total" first to prevent it from being removed by other patterns
  let ofTotal: string | null = null;
  const ofTotalMatch = cleaned.match(/\(of\s*(\d+)\)/i);
  if (ofTotalMatch) {
    ofTotal = ofTotalMatch[1]; // Just the number, e.g., "04"
    cleaned = cleaned.replace(ofTotalMatch[0], '').trim();
  }

  // Apply general metadata patterns
  metadataPatterns.forEach(pattern => { cleaned = cleaned.replace(pattern, ''); });
  cleaned = cleaned.replace(/\s+/g, ' ').trim(); // Final trim after all replacements

  // 1. Extract Year
  let year: number | null = null;
  const yearMatch = cleaned.match(/\((\d{4})\)/);
  if (yearMatch) {
    year = parseInt(yearMatch[1], 10);
    cleaned = cleaned.replace(yearMatch[0], '').trim();
  }

  // 2. Extract Volume
  let volume: string | null = null;
  // Check for standalone volume first, e.g., "V1", "V 1", "Vol 2"
  const standaloneVolumeMatch = cleaned.match(/\s(v|vol|volume)\s?(\d+)/i);
  if (standaloneVolumeMatch) {
    volume = standaloneVolumeMatch[2];
    cleaned = cleaned.replace(standaloneVolumeMatch[0], ' ');
  } else {
    const parenVolumeMatch = cleaned.match(/(?:\(v|vol|volume)\s*(\d{1,3})\)/i);
    if (parenVolumeMatch) {
      volume = parenVolumeMatch[1];
      cleaned = cleaned.replace(parenVolumeMatch[0], '');
    }
  }
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // 3. Extract Issue
  let issue: string | null = null;
  const issuePatterns = [
    { regex: /\s#(\d{1,4}(?:\.\d{1,2})?)/, group: 1 }, // #123
    { regex: /\sissue\s#?(\d{1,4}(?:\.\d{1,2})?)/i, group: 1 }, // issue 123
    { regex: /\s(\d{3,4})(?!\d)/, group: 1 }, // 001 (3 or 4 digits, not followed by another digit)
    { regex: /\s(\d{1,2}(?:\.\d{1,2})?)$/, group: 1 }, // 1 or 1.5 at the end
  ];

  for (const pattern of issuePatterns) {
    const issueMatch = cleaned.match(pattern.regex);
    if (issueMatch) {
      issue = issueMatch[pattern.group];
      // This is the key change: split the string at the issue number
      // to separate the series from the title.
      const parts = cleaned.split(issueMatch[0]);
      cleaned = parts[0]; // Everything before the issue is the series
      // The title (parts[1]) is effectively discarded from the series name, cleaning it up.
      break;
    }
  }

  // 4. The remainder is the series
  let series = cleaned.replace(/\[[^\]]*\]/g, '').replace(/\([^)]*\)/g, '').trim();
  // More aggressive cleanup: remove any characters that are not alphanumeric, whitespace, or hyphen globally
  series = series.replace(/[^a-zA-Z0-9\s-]/g, '').trim();
  
  // 5. Detect Publisher
  const publisher = detectPublisherFromCharacters(series);

  return {
    series: series || null,
    issue: issue ? issue.padStart(3, '0') : null,
    year,
    volume: volume || (year ? String(year) : null),
    publisher,
    ofTotal // Include the new field
  };
};

export const generateSuggestedFilename = (parsed: ParsedComicInfo): string => {
  if (!parsed.series || !parsed.issue) return '';
  let suggested = parsed.series;
  suggested += ` #${parsed.issue}`;
  if (parsed.ofTotal) suggested += ` (of ${parsed.ofTotal})`; // Add (of #) to suggested filename
  if (parsed.year) suggested += ` (${parsed.year})`;
  return suggested;
};