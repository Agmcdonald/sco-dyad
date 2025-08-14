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

// This will be populated with the preseeded data
let knowledgeDatabase: ComicKnowledge[] = [];

// Fuzzy string matching function
const fuzzyMatch = (str1: string, str2: string): number => {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  
  // Check if one string contains the other
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  
  // Simple word overlap scoring
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  const commonWords = words1.filter(word => words2.includes(word));
  
  if (commonWords.length === 0) return 0;
  
  return (commonWords.length * 2) / (words1.length + words2.length);
};

// Initialize the knowledge database
export const initializeKnowledgeBase = (data: ComicKnowledge[]) => {
  knowledgeDatabase = data;
  console.log(`Knowledge base initialized with ${data.length} series`);
};

// Search for matches in the knowledge base
export const searchKnowledgeBase = (parsed: ParsedComicInfo): KnowledgeMatch[] => {
  if (!parsed.series || knowledgeDatabase.length === 0) return [];
  
  const matches: Array<KnowledgeMatch & { score: number }> = [];
  
  for (const entry of knowledgeDatabase) {
    const seriesScore = fuzzyMatch(parsed.series, entry.series);
    
    if (seriesScore > 0.6) { // Only consider reasonable matches
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
        
        // Score based on year proximity
        const yearDiff = Math.abs(bestVolume.year - parsed.year);
        volumeScore = yearDiff === 0 ? 1.0 : Math.max(0.3, 1.0 - (yearDiff / 10));
      }
      
      const overallScore = (seriesScore * 0.7) + (volumeScore * 0.3);
      
      let confidence: 'High' | 'Medium' | 'Low' = 'Low';
      if (overallScore > 0.85) confidence = 'High';
      else if (overallScore > 0.7) confidence = 'Medium';
      
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
    .slice(0, 5)
    .map(({ score, ...match }) => match);
};

// Get suggestions for form fields
export const getKnowledgeSuggestions = (parsed: ParsedComicInfo) => {
  const matches = searchKnowledgeBase(parsed);
  const suggestions: Array<{ label: string; value: string; field: string }> = [];
  
  if (matches.length > 0) {
    const bestMatch = matches[0];
    
    if (bestMatch.confidence === 'High') {
      suggestions.push(
        { label: "Publisher", value: bestMatch.publisher, field: "publisher" },
        { label: "Volume", value: bestMatch.volume, field: "volume" }
      );
    }
  }
  
  return suggestions;
};

// Check if we have knowledge about a series
export const hasKnowledgeAbout = (seriesName: string): boolean => {
  return knowledgeDatabase.some(entry => 
    fuzzyMatch(seriesName, entry.series) > 0.8
  );
};