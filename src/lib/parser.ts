/**
 * @file Filename Parser
 * @summary A set of functions for parsing comic book filenames to extract metadata.
 * @description This module provides robust functionality to parse complex and often
 * inconsistent comic book filenames. It uses a series of regular expressions and
 * heuristics to identify key metadata such as series title, issue number, volume,
 * and year.
 */

/**
 * @interface ParsedComicInfo
 * @summary Defines the structure of the data extracted from a comic book filename.
 */
export interface ParsedComicInfo {
  series: string | null;
  issue: string | null;
  year: number | null;
  volume: string | null;
  publisher?: string | null;
  ofTotal?: string | null;
}

/**
 * @const {Record<string, string>} characterPublisherMap
 * @summary A mapping of famous comic book characters to their primary publishers.
 * @description Used by `detectPublisherFromCharacters` to infer the publisher
 * from the series name if it contains a well-known character.
 */
const characterPublisherMap: Record<string, string> = {
  // DC Comics characters
  'superman': 'DC Comics', 'batman': 'DC Comics', 'wonder woman': 'DC Comics', 'flash': 'DC Comics', 'green lantern': 'DC Comics', 'aquaman': 'DC Comics', 'cyborg': 'DC Comics', 'green arrow': 'DC Comics', 'martian manhunter': 'DC Comics', 'shazam': 'DC Comics', 'nightwing': 'DC Comics', 'robin': 'DC Comics', 'batgirl': 'DC Comics', 'supergirl': 'DC Comics', 'harley quinn': 'DC Comics', 'joker': 'DC Comics', 'catwoman': 'DC Comics', 'poison ivy': 'DC Comics', 'lex luthor': 'DC Comics', 'deathstroke': 'DC Comics', 'teen titans': 'DC Comics', 'justice league': 'DC Comics', 'birds of prey': 'DC Comics', 'suicide squad': 'DC Comics',
  // Marvel Comics characters
  'spider-man': 'Marvel Comics', 'spiderman': 'Marvel Comics', 'iron man': 'Marvel Comics', 'captain america': 'Marvel Comics', 'thor': 'Marvel Comics', 'hulk': 'Marvel Comics', 'black widow': 'Marvel Comics', 'hawkeye': 'Marvel Comics', 'ant-man': 'Marvel Comics', 'wasp': 'Marvel Comics', 'captain marvel': 'Marvel Comics', 'ms marvel': 'Marvel Comics', 'daredevil': 'Marvel Comics', 'punisher': 'Marvel Comics', 'deadpool': 'Marvel Comics', 'wolverine': 'Marvel Comics', 'x-men': 'Marvel Comics', 'fantastic four': 'Marvel Comics', 'avengers': 'Marvel Comics', 'guardians of the galaxy': 'Marvel Comics', 'doctor strange': 'Marvel Comics', 'scarlet witch': 'Marvel Comics', 'vision': 'Marvel Comics', 'falcon': 'Marvel Comics', 'winter soldier': 'Marvel Comics', 'black panther': 'Marvel Comics', 'storm': 'Marvel Comics', 'cyclops': 'Marvel Comics', 'jean grey': 'DC Comics', 'magneto': 'Marvel Comics', 'professor x': 'Marvel Comics', 'venom': 'Marvel Comics', 'carnage': 'Marvel Comics', 'green goblin': 'Marvel Comics', 'doctor octopus': 'Marvel Comics', 'thanos': 'Marvel Comics', 'loki': 'Marvel Comics', 'galactus': 'Marvel Comics',
};

/**
 * @const {RegExp[]} metadataPatterns
 * @summary A list of regular expression patterns to remove common, non-essential metadata from filenames.
 * @description These patterns are used to clean up the series name by removing tags like
 * (digital), (web-rip), (scan), and other common release group tags.
 */
const metadataPatterns = [
    /\(digital\)/gi, /\(web-rip\)/gi, /\(webrip\)/gi, /\(scan\)/gi, /\(cbr\)/gi, /\(cbz\)/gi, /\(pdf\)/gi, /\([^)]*-[^)]*\)/gi, /\([^)]*rip[^)]*\)/gi, /\([^)]*scan[^)]*\)/gi, /\(dcp\)/gi, /\(empire\)/gi, /\(son of ultron-empire\)/gi, /\(the last kryptonian-dcp\)/gi, /\(\d+\s*covers?\)/gi, /\(annual\)/gi, /\(one-shot\)/gi,
    /\(GetComics\.INFO\)/gi,
    /\(Digital\)/gi,
];

/**
 * @function detectPublisherFromCharacters
 * @summary Infers a comic's publisher based on character names in the series title.
 * @param {string} seriesName - The name of the comic series.
 * @returns {string | null} The detected publisher name or `null` if no match is found.
 */
const detectPublisherFromCharacters = (seriesName: string): string | null => {
  if (!seriesName) return null;
  const lowerSeries = seriesName.toLowerCase();
  for (const [character, publisher] of Object.entries(characterPublisherMap)) {
    if (lowerSeries.includes(character)) return publisher;
  }
  return null;
};

/**
 * @function parseFilename
 * @summary Parses a comic book filename to extract structured metadata.
 * @description This function applies a series of cleaning steps and regular expressions in a specific
 * order to reliably extract information like series, issue number, year, and volume.
 * The process is as follows:
 * 1. Extract and remove "(of X)" total issue count.
 * 2. Remove common metadata tags (e.g., "(digital)", "(scan)").
 * 3. Extract and remove the year (e.g., "(2023)").
 * 4. Extract and remove the volume number (e.g., "v2", "(vol 3)").
 * 5. Extract the issue number, which also helps separate the series name from any trailing title info.
 * 6. The remaining string is treated as the series name and is further cleaned.
 * 7. Attempt to detect the publisher from the series name.
 * @param {string} path - The full path or filename of the comic book.
 * @returns {ParsedComicInfo} An object containing the extracted metadata.
 */
export const parseFilename = (path: string): ParsedComicInfo => {
  const filename = path.split(/[\\/]/).pop() || '';
  let cleaned = filename.replace(/_/g, ' ').replace(/\.[^/.]+$/, "").trim();

  // Step 0: Extract "of Total" first to prevent it from being removed by other patterns.
  let ofTotal: string | null = null;
  const ofTotalMatch = cleaned.match(/\(of\s*(\d+)\)/i);
  if (ofTotalMatch) {
    ofTotal = ofTotalMatch[1];
    cleaned = cleaned.replace(ofTotalMatch[0], '').trim();
  }

  // Step 1: Apply general metadata patterns for cleaning.
  metadataPatterns.forEach(pattern => { cleaned = cleaned.replace(pattern, ''); });
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Step 2: Extract Year.
  let year: number | null = null;
  const yearMatch = cleaned.match(/\((\d{4})\)/);
  if (yearMatch) {
    year = parseInt(yearMatch[1], 10);
    cleaned = cleaned.replace(yearMatch[0], '').trim();
  }

  // Step 3: Extract Volume.
  let volume: string | null = null;
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

  // Step 4: Extract Issue Number. This is a critical step as it often separates the series from a subtitle.
  let issue: string | null = null;
  const issuePatterns = [
    { regex: /\s#(\d{1,4}(?:\.\d{1,2})?)/, group: 1 },
    { regex: /\sissue\s#?(\d{1,4}(?:\.\d{1,2})?)/i, group: 1 },
    { regex: /\s(\d{3,4})(?!\d)/, group: 1 },
    { regex: /\s(\d{1,2}(?:\.\d{1,2})?)$/, group: 1 },
  ];

  for (const pattern of issuePatterns) {
    const issueMatch = cleaned.match(pattern.regex);
    if (issueMatch) {
      issue = issueMatch[pattern.group];
      const parts = cleaned.split(issueMatch[0]);
      cleaned = parts[0];
      break;
    }
  }

  // Step 5: The remainder is the series name, which we clean aggressively.
  let series = cleaned.replace(/\[[^\]]*\]/g, '').replace(/\([^)]*\)/g, '').trim();
  series = series.replace(/[^a-zA-Z0-9\s-]/g, '').trim();
  
  // Step 6: Detect Publisher from character names in the series.
  const publisher = detectPublisherFromCharacters(series);

  return {
    series: series || null,
    issue: issue ? issue.padStart(3, '0') : null,
    year,
    volume: volume || (year ? String(year) : null),
    publisher,
    ofTotal
  };
};

/**
 * @function generateSuggestedFilename
 * @summary Creates a clean, standardized filename from parsed comic info.
 * @param {ParsedComicInfo} parsed - The parsed comic information object.
 * @returns {string} A suggested filename string (e.g., "Series Name #001 (2023)").
 */
export const generateSuggestedFilename = (parsed: ParsedComicInfo): string => {
  if (!parsed.series || !parsed.issue) return '';
  let suggested = parsed.series;
  suggested += ` #${parsed.issue}`;
  if (parsed.ofTotal) suggested += ` (of ${parsed.ofTotal})`;
  if (parsed.year) suggested += ` (${parsed.year})`;
  return suggested;
};