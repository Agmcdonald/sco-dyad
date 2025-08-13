export interface ParsedComicInfo {
  series: string | null;
  issue: string | null;
  year: number | null;
  volume: string | null;
}

// Regex to capture common patterns in comic book filenames
const issueRegex = /(?:#|issue|\s)(\d{1,4}(?:\.\d{1,2})?)/i;
const yearRegex = /\((20\d{2}|19\d{2})\)/;
const volumeRegex = /(?:v|vol|volume)\s*(\d{1,3})/i;

const clean = (name: string) => {
    return name
        .replace(/_/g, ' ') // Replace underscores with spaces
        .replace(/\.[^/.]+$/, "") // Remove file extension
        .replace(/[-.]/g, ' ') // Replace remaining separators
        .replace(/\s+/g, ' ') // Collapse multiple spaces
        .trim();
}

export const parseFilename = (path: string): ParsedComicInfo => {
  const pathParts = path.split(/[\\/]/);
  const filename = pathParts[pathParts.length - 1];
  const folderName = pathParts.length > 1 ? pathParts[pathParts.length - 2] : '';

  // --- Parse Filename ---
  let cleanedFilename = filename.replace(/\.[^/.]+$/, ""); // Remove extension
  
  const yearMatch = cleanedFilename.match(yearRegex);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : null;
  if (yearMatch) cleanedFilename = cleanedFilename.replace(yearRegex, '').trim();

  const issueMatch = cleanedFilename.match(issueRegex);
  const issue = issueMatch ? issueMatch[1] : null;
  if (issueMatch) cleanedFilename = cleanedFilename.replace(issueRegex, '').trim();
  
  const volumeMatch = cleanedFilename.match(volumeRegex);
  const volume = volumeMatch ? volumeMatch[1] : null;
  if (volumeMatch) cleanedFilename = cleanedFilename.replace(volumeRegex, '').trim();

  const seriesFromFilename = clean(cleanedFilename);

  // --- Parse Folder Name ---
  // The folder name is often a good candidate for the series name
  const seriesFromFolder = clean(folderName);

  // --- Combine Results ---
  // Prefer the folder name for the series if it's not a generic name like "incoming"
  const series = (seriesFromFolder && !/incoming|scans/i.test(seriesFromFolder)) 
    ? seriesFromFolder 
    : seriesFromFilename;

  return { series, issue, year, volume };
};