export interface ParsedComicInfo {
  series: string | null;
  issue: string | null;
  year: number | null;
  volume: string | null;
  publisher?: string | null;
}

// Character to publisher mapping
const characterPublisherMap: Record<string, string> = {
  // DC Comics characters
  'superman': 'DC Comics', 'batman': 'DC Comics', 'wonder woman': 'DC Comics', 'flash': 'DC Comics', 'green lantern': 'DC Comics', 'aquaman': 'DC Comics', 'cyborg': 'DC Comics', 'green arrow': 'DC Comics', 'martian manhunter': 'DC Comics', 'shazam': 'DC Comics', 'nightwing': 'DC Comics', 'robin': 'DC Comics', 'batgirl': 'DC Comics', 'supergirl': 'DC Comics', 'harley quinn': 'DC Comics', 'joker': 'DC Comics', 'catwoman': 'DC Comics', 'poison ivy': 'DC Comics', 'lex luthor': 'DC Comics', 'deathstroke': 'DC Comics', 'teen titans': 'DC Comics', 'justice league': 'DC Comics', 'birds of prey': 'DC Comics', 'suicide squad': 'DC Comics',
  // Marvel Comics characters
  'spider-man': 'Marvel Comics', 'spiderman': 'Marvel Comics', 'iron man': 'Marvel Comics', 'captain america': 'Marvel Comics', 'thor': 'Marvel Comics', 'hulk': 'Marvel Comics', 'black widow': 'Marvel Comics', 'hawkeye': 'Marvel Comics', 'ant-man': 'Marvel Comics', 'wasp': 'Marvel Comics', 'captain marvel': 'Marvel Comics', 'ms marvel': 'Marvel Comics', 'daredevil': 'Marvel Comics', 'punisher': 'Marvel Comics', 'deadpool': 'Marvel Comics', 'wolverine': 'Marvel Comics', 'x-men': 'Marvel Comics', 'fantastic four': 'Marvel Comics', 'avengers': 'Marvel Comics', 'guardians of the galaxy': 'Marvel Comics', 'doctor strange': 'Marvel Comics', 'scarlet witch': 'Marvel Comics', 'vision': 'Marvel Comics', 'falcon': 'Marvel Comics', 'winter soldier': 'Marvel Comics', 'black panther': 'Marvel Comics', 'storm': 'Marvel Comics', 'cyclops': 'Marvel Comics', 'jean grey': 'Marvel Comics', 'magneto': 'Marvel Comics', 'professor x': 'Marvel Comics', 'venom': 'Marvel Comics', 'carnage': 'Marvel Comics', 'green goblin': 'Marvel Comics', 'doctor octopus': 'Marvel Comics', 'thanos': 'Marvel Comics', 'loki': 'Marvel Comics', 'galactus': 'Marvel Comics',
};

// Patterns to remove common metadata that clutters series names
const metadataPatterns = [
    /\(digital\)/gi, /\(web-rip\)/gi, /\(webrip\)/gi, /\(scan\)/gi, /\(cbr\)/gi, /\(cbz\)/gi, /\(pdf\)/gi, /\([^)]*-[^)]*\)/gi, /\([^)]*rip[^)]*\)/gi, /\([^)]*scan[^)]*\)/gi, /\(dcp\)/gi, /\(empire\)/gi, /\(son of ultron-empire\)/gi, /\(the last kryptonian-dcp\)/gi, /\(\d+\s*covers?\)/gi, /\(annual\)/gi, /\(one-shot\)/gi,
];

const clean = (name: string): string => {
  let cleaned = name.replace(/_/g, ' ').replace(/\.[^/.]+$/, "").trim();
  metadataPatterns.forEach(pattern => { cleaned = cleaned.replace(pattern, ''); });
  return cleaned.replace(/\s+/g, ' ').trim();
};

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
  let cleaned = clean(filename);

  // 1. Extract Year
  let year: number | null = null;
  const yearMatch = cleaned.match(/\((\d{4})\)/);
  if (yearMatch) {
    year = parseInt(yearMatch[1], 10);
    cleaned = cleaned.replace(yearMatch[0], '').trim();
  }

  // 2. Extract Volume
  let volume: string | null = null;
  const volumeMatch = cleaned.match(/(?:\(v|vol|volume)\s*(\d{1,3})\)/i);
  if (volumeMatch) {
    volume = volumeMatch[1];
    cleaned = cleaned.replace(volumeMatch[0], '').trim();
  }

  // 3. Extract Issue (from most specific to least specific)
  let issue: string | null = null;
  const issuePatterns = [
    { regex: /\s#(\d{1,4}(?:\.\d{1,2})?)/, group: 1 }, // #123
    { regex: /\sissue\s#?(\d{1,4}(?:\.\d{1,2})?)/i, group: 1 }, // issue 123
    { regex: /\s(\d{3,4})/, group: 1 }, // 001 (3 or 4 digits)
    { regex: /\s(\d{1,2}(?:\.\d{1,2})?)$/, group: 1 }, // 1 or 1.5 at the end
  ];

  for (const pattern of issuePatterns) {
    const issueMatch = cleaned.match(pattern.regex);
    if (issueMatch) {
      issue = issueMatch[pattern.group];
      cleaned = cleaned.replace(issueMatch[0], '').trim();
      break;
    }
  }

  // 4. The remainder is the series
  let series = cleaned.replace(/\[[^\]]*\]/g, '').replace(/\([^)]*\)/g, '').trim();

  // 5. Detect Publisher
  const publisher = detectPublisherFromCharacters(series);

  return {
    series: series || null,
    issue: issue ? issue.padStart(3, '0') : null,
    year,
    volume: volume || (year ? String(year) : null),
    publisher
  };
};

export const generateSuggestedFilename = (parsed: ParsedComicInfo): string => {
  if (!parsed.series || !parsed.issue) return '';
  let suggested = parsed.series;
  suggested += ` #${parsed.issue}`;
  if (parsed.year) suggested += ` (${parsed.year})`;
  return suggested;
};