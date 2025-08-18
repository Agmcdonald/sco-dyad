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
const issueRangeRegex = /\d{3}-\d{3}/; // Detects ranges like "001-006"

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

// Check if a folder name contains an issue range (like "001-006")
const containsIssueRange = (folderName: string): boolean => {
  return issueRangeRegex.test(folderName);
};

// Extract clean series name from folder, removing issue ranges
const extractSeriesFromFolder = (folderName: string): string => {
  let cleanFolder = folderName;
  
  // Remove issue ranges like "001-006"
  cleanFolder = cleanFolder.replace(/\s*\d{3}-\d{3}\s*/g, '').trim();
  
  // Remove year in parentheses to get just the series name
  cleanFolder = cleanFolder.replace(/\s*\(\d{4}\)\s*/g, '').trim();
  
  return cleanFolder;
};

export const parseFilename = (path: string): ParsedComicInfo => {
  console.log(`[PARSER] Parsing filename: ${path}`);
  
  const pathParts = path.split(/[\\/]/);
  const filename = pathParts[pathParts.length - 1];
  const folderName = pathParts.length > 1 ? pathParts[pathParts.length - 2] : '';

  console.log(`[PARSER] Filename: ${filename}`);
  console.log(`[PARSER] Folder: ${folderName}`);

  // --- Parse Filename ---
  let cleanedFilename = filename.replace(/\.[^/.]+$/, ""); // Remove extension
  console.log(`[PARSER] Cleaned filename: ${cleanedFilename}`);

  // Apply metadata cleaning patterns first
  metadataPatterns.forEach(pattern => {
    cleanedFilename = cleanedFilename.replace(pattern, '');
  });
  cleanedFilename = cleanedFilename.trim();
  console.log(`[PARSER] After metadata removal: ${cleanedFilename}`);
  
  // Extract year first (most reliable)
  const yearMatch = cleanedFilename.match(yearRegex);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : null;
  console.log(`[PARSER] Year match: ${yearMatch?.[0]} -> ${year}`);
  if (yearMatch) {
    cleanedFilename = cleanedFilename.replace(yearRegex, '').trim();
    console.log(`[PARSER] After year removal: ${cleanedFilename}`);
  }

  // Extract issue number - improved pattern to catch "001", "1", etc.
  const issuePatterns = [
    /\b(\d{3})\b/,  // Three digit numbers like "001"
    /\b#(\d{1,4}(?:\.\d{1,2})?)\b/,  // Hash followed by number
    /\bissue\s*(\d{1,4}(?:\.\d{1,2})?)\b/i,  // "issue 1"
    /\b(\d{1,4}(?:\.\d{1,2})?)\b/  // Any standalone number (fallback)
  ];
  
  let issue = null;
  let issueMatch = null;
  
  for (const pattern of issuePatterns) {
    issueMatch = cleanedFilename.match(pattern);
    if (issueMatch) {
      issue = issueMatch[1];
      console.log(`[PARSER] Issue match with pattern ${pattern}: ${issueMatch[0]} -> ${issue}`);
      cleanedFilename = cleanedFilename.replace(issueMatch[0], '').trim();
      console.log(`[PARSER] After issue removal: ${cleanedFilename}`);
      break;
    }
  }
  
  // Extract volume
  const volumeMatch = cleanedFilename.match(volumeRegex);
  const volume = volumeMatch ? volumeMatch[1] : null;
  console.log(`[PARSER] Volume match: ${volumeMatch?.[0]} -> ${volume}`);
  if (volumeMatch) {
    cleanedFilename = cleanedFilename.replace(volumeRegex, '').trim();
    console.log(`[PARSER] After volume removal: ${cleanedFilename}`);
  }

  // Clean the remaining text to get series name from filename
  let seriesFromFile = clean(cleanedFilename);
  seriesFromFile = seriesFromFile.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').trim();
  console.log(`[PARSER] Series from file after cleaning: ${seriesFromFile}`);

  // --- Parse Folder Name ---
  let seriesFromFolder = '';
  if (folderName && !/incoming|scans|comics|downloads/i.test(folderName)) {
    if (containsIssueRange(folderName)) {
      console.log(`[PARSER] Folder contains issue range, extracting series name only`);
      seriesFromFolder = extractSeriesFromFolder(folderName);
    } else {
      seriesFromFolder = clean(folderName);
    }
    console.log(`[PARSER] Series from folder: ${seriesFromFolder}`);
  }

  // --- Combine Results ---
  // NEW LOGIC: Prioritize file parsing, use folder only as fallback for series name
  let finalSeries = seriesFromFile;
  
  // Only use folder name if:
  // 1. We couldn't get a series from the file, OR
  // 2. The folder series is significantly longer/more descriptive
  if (!seriesFromFile && seriesFromFolder) {
    finalSeries = seriesFromFolder;
    console.log(`[PARSER] Using folder name as fallback: ${finalSeries}`);
  } else if (seriesFromFile && seriesFromFolder && seriesFromFolder.length > seriesFromFile.length + 5) {
    // Only override if folder name is significantly more descriptive
    finalSeries = seriesFromFolder;
    console.log(`[PARSER] Using more descriptive folder name: ${finalSeries}`);
  } else if (seriesFromFile) {
    console.log(`[PARSER] Using series from filename: ${finalSeries}`);
  }

  // Format issue number with leading zeros for display
  if (issue) {
    // Pad with leading zeros if it's a simple number
    if (/^\d+$/.test(issue)) {
      issue = issue.padStart(3, '0');
      console.log(`[PARSER] Formatted issue: ${issue}`);
    }
  }

  // Detect publisher based on character names
  const detectedPublisher = detectPublisherFromCharacters(finalSeries);
  console.log(`[PARSER] Detected publisher: ${detectedPublisher}`);

  const result = { 
    series: finalSeries || null, 
    issue: issue || null, 
    year, 
    volume,
    publisher: detectedPublisher
  };
  
  console.log(`[PARSER] Final result:`, result);
  return result;
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