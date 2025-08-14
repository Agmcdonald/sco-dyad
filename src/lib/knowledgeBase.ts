import { ParsedComicInfo } from "./parser";

export interface ComicKnowledge {
  series: string;
  publisher: string;
  startYear: number;
  volumes: Array<{
    volume: string;
    year: number;
  }>;
}

export interface KnowledgeMatch {
  series: string;
  publisher: string;
  volume: string;
  confidence: 'High' | 'Medium' | 'Low';
  startYear: number;
}

// This will be populated by the context
let knowledgeDatabase: ComicKnowledge[] = [];

// Enhanced fuzzy string matching function with better normalization
const normalizeString = (str: string): string => {
  return str.toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
};

const fuzzyMatch = (str1: string, str2: string): number => {
  const s1 = normalizeString(str1);
  const s2 = normalizeString(str2);
  
  if (s1 === s2) return 1.0;
  
  // Check if one string contains the other
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  
  // Check for common prefixes/suffixes
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  
  // Calculate Jaccard similarity (intersection over union)
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  if (union.size === 0) return 0;
  
  const jaccardSimilarity = intersection.size / union.size;
  
  // Bonus for exact word matches
  const exactMatches = words1.filter(word => words2.includes(word)).length;
  const exactBonus = exactMatches > 0 ? 0.2 : 0;
  
  return Math.min(1.0, jaccardSimilarity + exactBonus);
};

// Initialize the knowledge database
export const initializeKnowledgeBase = (data: ComicKnowledge[]) => {
  knowledgeDatabase = data;
  console.log(`Knowledge base initialized with ${data.length} series`);
};

// Search for matches in the knowledge base with improved scoring
export const searchKnowledgeBase = (parsed: ParsedComicInfo): KnowledgeMatch[] => {
  if (!parsed.series || knowledgeDatabase.length === 0) return [];
  
  const matches: Array<KnowledgeMatch & { score: number }> = [];
  
  for (const entry of knowledgeDatabase) {
    const seriesScore = fuzzyMatch(parsed.series, entry.series);
    
    if (seriesScore > 0.5) { // Lower threshold for more matches
      // Find the best volume match based on year
      let bestVolume = entry.volumes[0];
      let volumeScore = 0.5; // Default score
      
      if (parsed.year) {
        // Find volume closest to the parsed year
        bestVolume = entry.volumes.reduce((best, vol) => {
          const yearDiff = Math.abs(vol.year - parsed.year!);
          const bestYearDiff = Math.abs(best.year - parsed.year!);
          return yearDiff < bestYearDiff ? vol : best;
        });
        
        // Score based on year proximity with more generous scoring
        const yearDiff = Math.abs(bestVolume.year - parsed.year);
        if (yearDiff === 0) volumeScore = 1.0;
        else if (yearDiff <= 2) volumeScore = 0.9;
        else if (yearDiff <= 5) volumeScore = 0.7;
        else volumeScore = Math.max(0.3, 1.0 - (yearDiff / 20));
      }
      
      // Weight series matching more heavily
      const overallScore = (seriesScore * 0.8) + (volumeScore * 0.2);
      
      let confidence: 'High' | 'Medium' | 'Low' = 'Low';
      if (overallScore > 0.8 && seriesScore > 0.8) confidence = 'High';
      else if (overallScore > 0.65) confidence = 'Medium';
      
      matches.push({
        series: entry.series,
        publisher: entry.publisher,
        volume: bestVolume.volume,
        confidence,
        startYear: entry.startYear,
        score: overallScore
      });
    }
  }
  
  // Sort by score and return top matches
  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, 8) // Return more matches
    .map(({ score, ...match }) => match);
};

// Get suggestions for form fields with enhanced logic
export const getKnowledgeSuggestions = (parsed: ParsedComicInfo) => {
  const matches = searchKnowledgeBase(parsed);
  const suggestions: Array<{ label: string; value: string; field: string }> = [];
  
  if (matches.length > 0) {
    const bestMatch = matches[0];
    
    // Always suggest publisher from best match
    if (bestMatch.publisher) {
      suggestions.push({ label: "Publisher", value: bestMatch.publisher, field: "publisher" });
    }
    
    // Suggest volume if confidence is medium or higher
    if (bestMatch.confidence !== 'Low' && bestMatch.volume) {
      suggestions.push({ label: "Volume", value: bestMatch.volume, field: "volume" });
    }
    
    // If series match is very close, suggest the canonical series name
    if (bestMatch.confidence === 'High' && bestMatch.series !== parsed.series) {
      suggestions.push({ label: "Series", value: bestMatch.series, field: "series" });
    }
  }
  
  return suggestions;
};

// Check if we have knowledge about a series with improved matching
export const hasKnowledgeAbout = (seriesName: string): boolean => {
  return knowledgeDatabase.some(entry => 
    fuzzyMatch(seriesName, entry.series) > 0.7
  );
};

// Get publisher suggestions based on partial input
export const getPublisherSuggestions = (input: string): string[] => {
  if (!input || input.length < 2) return [];
  
  const publishers = [...new Set(knowledgeDatabase.map(entry => entry.publisher))];
  const normalizedInput = normalizeString(input);
  
  return publishers
    .filter(publisher => normalizeString(publisher).includes(normalizedInput))
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 10);
};

// Get series suggestions based on partial input and optional publisher filter
export const getSeriesSuggestions = (input: string, publisher?: string): string[] => {
  if (!input || input.length < 2) return [];
  
  let filteredEntries = knowledgeDatabase;
  if (publisher) {
    filteredEntries = knowledgeDatabase.filter(entry => 
      normalizeString(entry.publisher) === normalizeString(publisher)
    );
  }
  
  const normalizedInput = normalizeString(input);
  
  return filteredEntries
    .map(entry => entry.series)
    .filter(series => normalizeString(series).includes(normalizedInput))
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 10);
};