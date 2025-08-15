export interface ParsedComicInfo {
  series: string | null;
  issue: string | null;
  year: number | null;
  volume: string | null;
  publisher?: string | null; // Add publisher detection
}

// Enhanced regex patterns for better parsing
const issueRegex = /(?:#|issue|\s)(\d{1,4}(?:\.\d{1,2})?)/i;
const yearRegex = /\((20\d{2}|19\d{2})\)/;
const volumeRegex = /(?:v|vol|volume)\s*(\d{1,3})/i;

// Character to publisher mapping
const characterPublisherMap: Record<string, string> = {
  // DC Comics characters
  'superman': 'DC Comics',
  'batman': 'DC Comics',
  'wonder woman': 'DC Comics',
  'flash': 'DC Comics',
  'green lantern': 'DC Comics',
  'aquaman': 'DC Comics',
  'cyborg': 'DC Comics',
  'green arrow': 'DC Comics',
  'martian manhunter': 'DC Comics',
  'shazam': 'DC Comics',
  'nightwing': 'DC Comics',
  'robin': 'DC Comics',
  'batgirl': 'DC Comics',
  'supergirl': 'DC Comics',
  'harley quinn': 'DC Comics',
  'joker': 'DC Comics',
  'catwoman': 'DC Comics',
  'poison ivy': 'DC Comics',
  'lex luthor': 'DC Comics',
  'deathstroke': 'DC Comics',
  'teen titans': 'DC Comics',
  'justice league': 'DC Comics',
  'birds of prey': 'DC Comics',
  'suicide squad': 'DC Comics',
  
  // Marvel Comics characters
  'spider-man': 'Marvel Comics',
  'spiderman': 'Marvel Comics',
  'iron man': 'Marvel Comics',
  'captain america': 'Marvel Comics',
  'thor': 'Marvel Comics',
  'hulk': 'Marvel Comics',
  'black widow': 'Marvel Comics',
  'hawkeye': 'Marvel Comics',
  'ant-man': 'Marvel Comics',
  'wasp': 'Marvel Comics',
  'captain marvel': 'Marvel Comics', // Carol Danvers
  'ms marvel': 'Marvel Comics',
  'daredevil': 'Marvel Comics',
  'punisher': 'Marvel Comics',
  'deadpool': 'Marvel Comics',
  'wolverine': 'Marvel Comics',
  'x-men': 'Marvel Comics',
  'fantastic four': 'Marvel Comics',
  'avengers': 'Marvel Comics',
  'guardians of the galaxy': 'Marvel Comics',
  'doctor strange': 'Marvel Comics',
  'scarlet witch': 'Marvel Comics',
  'vision': 'Marvel Comics',
  'falcon': 'Marvel Comics',
  'winter soldier': 'Marvel Comics',
  'black panther': 'Marvel Comics',
  'storm': 'Marvel Comics',
  'cyclops': 'Marvel Comics',
  'jean grey': 'Marvel Comics',
  'magneto': 'Marvel Comics',
  'professor x': 'Marvel Comics',
  'venom': 'Marvel Comics',
  'carnage': 'Marvel Comics',
  'green goblin': 'Marvel Comics',
  'doctor octopus': 'Marvel Comics',
  'thanos': 'Marvel Comics',
  'loki': 'Marvel Comics',
  'galactus': 'Marvel Comics',
};

// Patterns to remove common metadata that clutters series names
const metadataPatterns = [
    /\(digital\)/gi,
    /\(web-rip\)/gi,
    /\(webrip\)/gi,
    /\(scan\)/gi,
    /\(cbr\)/gi,
    /\(cbz\)/gi,
    /\(pdf\)/gi,
    /\([^)]*-[^)]*\)/gi, // Catches (Kileko-Empire), (The Last Kryptonian-DCP)
    /\([^)]*rip[^)]*\)/gi,
    /\([^)]*scan[^)]*\)/gi,
    /\(dcp\)/gi,
    /\(empire\)/gi,
    /\(son of ultron-empire\)/gi,
    /\(the last kryptonian-dcp\)/gi,
    /\(\d+\)$/gi,
    /\(\d+\s*covers?\)/gi, // New: (2 covers)
    /\(annual\)/gi, // New
    /\(one-shot\)/gi, // New
];

const clean = (name: string): string => {
  let cleaned = name
    .replace(/_/g, ' ') // Replace underscores with spaces
    .replace(/\.[^/.]+$/, "") // Remove file extension
    .trim();
  
  // Remove metadata patterns first
  metadataPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  // Clean up separators but preserve hyphens in series names like "Spider-Man"
  cleaned = cleaned
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
  
  return cleaned;
};

// Detect publisher based on character names in the series title
const detectPublisherFromCharacters = (seriesName: string): string | null => {
  if (!seriesName) return null;
  
  const lowerSeries = seriesName.toLowerCase();
  
  // Check for character matches
  for (const [character, publisher] of Object.entries(characterPublisherMap)) {
    if (lowerSeries.includes(character)) {
      return publisher;
    }
  }
  
  return null;
};

export const parseFilename = (path: string): ParsedComicInfo => {
  const pathParts = path.split(/[\\/]/);
  const filename = pathParts[pathParts.length - 1];
  const folderName = pathParts.length > 1 ? pathParts[pathParts.length - 2] : '';

  // --- Parse Filename ---
  let cleanedFilename = filename.replace(/\.[^/.]+$/, ""); // Remove extension

  // Apply metadata cleaning patterns first
  metadataPatterns.forEach(pattern => {
    cleanedFilename = cleanedFilename.replace(pattern, '');
  });
  cleanedFilename = cleanedFilename.trim();
  
  // Extract year first (most reliable)
  const yearMatch = cleanedFilename.match(yearRegex);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : null;
  if (yearMatch) {
    cleanedFilename = cleanedFilename.replace(yearRegex, '').trim();
  }

  // Extract issue number - look for patterns like "001", "#1", "issue 1"
  const issueMatch = cleanedFilename.match(/\b(\d{1,4}(?:\.\d{1,2})?)\b/);
  let issue = issueMatch ? issueMatch[1] : null;
  if (issueMatch) {
    cleanedFilename = cleanedFilename.replace(issueMatch[0], '').trim();
  }
  
  // Extract volume
  const volumeMatch = cleanedFilename.match(volumeRegex);
  const volume = volumeMatch ? volumeMatch[1] : null;
  if (volumeMatch) {
    cleanedFilename = cleanedFilename.replace(volumeRegex, '').trim();
  }

  // Clean the remaining text to get series name
  let series = clean(cleanedFilename);
  series = series.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').trim();

  // --- Parse Folder Name ---
  const seriesFromFolder = clean(folderName);

  // --- Combine Results ---
  // Prefer the folder name for the series if it's not a generic name
  if (seriesFromFolder && !/incoming|scans|comics|downloads/i.test(seriesFromFolder)) {
    series = seriesFromFolder;
  }

  // Format issue number with leading zeros for display
  if (issue) {
    // Pad with leading zeros if it's a simple number
    if (/^\d+$/.test(issue)) {
      issue = issue.padStart(3, '0');
    }
  }

  // Detect publisher based on character names
  const detectedPublisher = detectPublisherFromCharacters(series);

  return { 
    series: series || null, 
    issue: issue || null, 
    year, 
    volume,
    publisher: detectedPublisher
  };
};

// Helper function to generate a clean, suggested filename
export const generateSuggestedFilename = (parsed: ParsedComicInfo): string => {
  if (!parsed.series || !parsed.issue) {
    return '';
  }

  let suggested = parsed.series;
  
  // Add issue with # prefix
  suggested += ` #${parsed.issue}`;
  
  // Add year in parentheses
  if (parsed.year) {
    suggested += ` (${parsed.year})`;
  }

  return suggested;
};