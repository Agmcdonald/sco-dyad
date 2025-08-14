export interface ParsedComicInfo {
  series: string | null;
  issue: string | null;
  year: number | null;
  volume: string | null;
}

// Enhanced regex patterns for better parsing
const issueRegex = /(?:#|issue|\s)(\d{1,4}(?:\.\d{1,2})?)/i;
const yearRegex = /\((20\d{2}|19\d{2})\)/;
const volumeRegex = /(?:v|vol|volume)\s*(\d{1,3})/i;

// Patterns to remove common metadata that clutters series names
const metadataPatterns = [
  /\(webrip\)/gi,
  /\(web-rip\)/gi,
  /\(digital\)/gi,
  /\(scan\)/gi,
  /\(cbr\)/gi,
  /\(cbz\)/gi,
  /\(pdf\)/gi,
  /\([^)]*-DCP\)/gi,  // Remove release group tags like "(The Last Kryptonian-DCP)"
  /\([^)]*rip[^)]*\)/gi,  // Remove any rip-related tags
  /\([^)]*scan[^)]*\)/gi,  // Remove scan-related tags
  /\(\d+\)$/gi,  // Remove trailing numbers like "(1)" at the end
  /\s*-\s*\d+\s*$/, // Remove trailing " - 1" patterns
];

const clean = (name: string) => {
    let cleaned = name
        .replace(/_/g, ' ') // Replace underscores with spaces
        .replace(/\.[^/.]+$/, "") // Remove file extension
        .replace(/[-.]/g, ' ') // Replace remaining separators with spaces
        .replace(/\s+/g, ' ') // Collapse multiple spaces
        .trim();
    
    // Remove metadata patterns
    metadataPatterns.forEach(pattern => {
        cleaned = cleaned.replace(pattern, '');
    });
    
    // Final cleanup
    cleaned = cleaned
        .replace(/\s+/g, ' ') // Collapse spaces again
        .trim();
    
    return cleaned;
}

export const parseFilename = (path: string): ParsedComicInfo => {
  const pathParts = path.split(/[\\/]/);
  const filename = pathParts[pathParts.length - 1];
  const folderName = pathParts.length > 1 ? pathParts[pathParts.length - 2] : '';

  // --- Parse Filename ---
  let cleanedFilename = filename.replace(/\.[^/.]+$/, ""); // Remove extension
  
  // Extract year first (most reliable)
  const yearMatch = cleanedFilename.match(yearRegex);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : null;
  if (yearMatch) {
    cleanedFilename = cleanedFilename.replace(yearRegex, '').trim();
  }

  // Extract issue number
  const issueMatch = cleanedFilename.match(issueRegex);
  let issue = issueMatch ? issueMatch[1] : null;
  if (issueMatch) {
    cleanedFilename = cleanedFilename.replace(issueRegex, '').trim();
  }

  // Try to find issue number in different formats if not found
  if (!issue) {
    // Look for standalone numbers that might be issues
    const standaloneNumberMatch = cleanedFilename.match(/\b(\d{1,4})\b/);
    if (standaloneNumberMatch) {
      issue = standaloneNumberMatch[1];
      cleanedFilename = cleanedFilename.replace(standaloneNumberMatch[0], '').trim();
    }
  }
  
  // Extract volume
  const volumeMatch = cleanedFilename.match(volumeRegex);
  const volume = volumeMatch ? volumeMatch[1] : null;
  if (volumeMatch) {
    cleanedFilename = cleanedFilename.replace(volumeRegex, '').trim();
  }

  // Clean the remaining text to get series name
  const seriesFromFilename = clean(cleanedFilename);

  // --- Parse Folder Name ---
  const seriesFromFolder = clean(folderName);

  // --- Combine Results ---
  // Prefer the folder name for the series if it's not a generic name
  let series = (seriesFromFolder && !/incoming|scans|comics|downloads/i.test(seriesFromFolder)) 
    ? seriesFromFolder 
    : seriesFromFilename;

  // Format issue number with leading zeros and # prefix for display
  if (issue) {
    // Pad with leading zeros if it's a simple number
    if (/^\d+$/.test(issue)) {
      issue = issue.padStart(3, '0');
    }
  }

  return { 
    series: series || null, 
    issue: issue || null, 
    year, 
    volume 
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