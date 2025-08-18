import { parseFilename } from "./parser";
import { QueuedFile, Confidence, Creator } from "@/types";
import { fetchComicMetadata, fetchMarvelMetadata } from "./scraper";
import { GcdDatabaseService } from "@/services/gcdDatabaseService";

export interface ProcessingResult {
  success: boolean;
  confidence: Confidence;
  data?: {
    series: string;
    issue: string;
    year: number;
    publisher: string;
    volume: string;
    summary: string;
    creators?: Creator[];
    title?: string;
    coverDate?: string;
    genre?: string;
    characters?: string;
  };
  error?: string;
}

// Smart processor that combines parsing with knowledge base matching
export const processComicFile = async (
  file: QueuedFile, 
  comicVineApiKey: string,
  marvelPublicKey: string,
  marvelPrivateKey: string,
  gcdDbService?: GcdDatabaseService | null
): Promise<ProcessingResult> => {
  try {
    console.log(`[SMART-PROCESSOR] Processing file: ${file.name}`);
    const parsed = parseFilename(file.path);
    console.log(`[SMART-PROCESSOR] Parsed data:`, parsed);
    
    if (!parsed.series || !parsed.issue) {
      console.log(`[SMART-PROCESSOR] Failed to parse series or issue from: ${file.name}`);
      return {
        success: false,
        confidence: "Low",
        error: "Could not extract series name or issue number from filename",
      };
    }

    // 1. Attempt GCD DB search first (if available and connected)
    if (gcdDbService && parsed.series) {
      console.log(`[SMART-PROCESSOR] Attempting GCD database search for: ${parsed.series}`);
      try {
        const gcdResults = await gcdDbService.searchSeries(parsed.series);
        console.log(`[SMART-PROCESSOR] GCD search results:`, gcdResults);
        
        if (gcdResults && gcdResults.length > 0) {
          const bestMatch = gcdResults[0];
          console.log(`[SMART-PROCESSOR] Best GCD match:`, bestMatch);
          
          const issueDetails = await gcdDbService.getIssueDetails(bestMatch.id, parsed.issue);
          console.log(`[SMART-PROCESSOR] Issue details:`, issueDetails);
          
          let creators: Creator[] = [];
          if (issueDetails) {
            creators = await gcdDbService.getIssueCreators(issueDetails.id);
            console.log(`[SMART-PROCESSOR] Creators:`, creators);
          }
          
          return {
            success: true,
            confidence: issueDetails ? "High" : "Medium",
            data: {
              series: bestMatch.name,
              issue: parsed.issue,
              year: parsed.year || bestMatch.year_began,
              publisher: bestMatch.publisher,
              volume: String(bestMatch.year_began),
              summary: issueDetails?.synopsis || `Matched from local GCD: ${bestMatch.name}`,
              title: issueDetails?.title,
              coverDate: issueDetails?.publication_date,
              genre: issueDetails?.genre,
              characters: issueDetails?.characters,
              creators: creators
            }
          };
        }
      } catch (error) {
        console.error(`[SMART-PROCESSOR] GCD database error:`, error);
        // Continue to other methods if GCD fails
      }
    } else {
      console.log(`[SMART-PROCESSOR] GCD database not available or not connected`);
    }

    // 2. Attempt Marvel API fetch if it's a Marvel comic
    if (parsed.publisher?.toLowerCase() === 'marvel comics' && marvelPublicKey && marvelPrivateKey) {
      console.log(`[SMART-PROCESSOR] Attempting Marvel API search`);
      const marvelResult = await fetchMarvelMetadata(parsed, marvelPublicKey, marvelPrivateKey);
      if (marvelResult.success && marvelResult.data) {
        console.log(`[SMART-PROCESSOR] Marvel API success`);
        return {
          success: true,
          confidence: marvelResult.data.confidence,
          data: {
            series: marvelResult.data.series || parsed.series,
            issue: parsed.issue,
            year: parsed.year || new Date().getFullYear(),
            publisher: marvelResult.data.publisher,
            volume: marvelResult.data.volume,
            summary: marvelResult.data.summary,
            creators: marvelResult.data.creators,
            title: marvelResult.data.title,
            coverDate: marvelResult.data.coverDate,
          }
        };
      }
    }

    // 3. Attempt Comic Vine API fetch for other publishers
    if (comicVineApiKey) {
      console.log(`[SMART-PROCESSOR] Attempting Comic Vine API search`);
      const apiResult = await fetchComicMetadata(parsed, comicVineApiKey);
      if (apiResult.success && apiResult.data) {
        console.log(`[SMART-PROCESSOR] Comic Vine API success`);
        return {
          success: true,
          confidence: apiResult.data.confidence,
          data: {
            series: apiResult.data.series || parsed.series,
            issue: parsed.issue,
            year: parsed.year || new Date().getFullYear(),
            publisher: apiResult.data.publisher,
            volume: apiResult.data.volume,
            summary: apiResult.data.summary,
            creators: apiResult.data.creators
          }
        };
      }
    }

    // 4. Fallback to parsed data only
    if (parsed.year) {
      console.log(`[SMART-PROCESSOR] Using parsed data as fallback`);
      return {
        success: true,
        confidence: parsed.publisher ? "Medium" : "Low",
        data: {
          series: parsed.series,
          issue: parsed.issue,
          year: parsed.year,
          publisher: parsed.publisher || "Unknown Publisher",
          volume: parsed.volume || String(parsed.year),
          summary: `Parsed from filename: ${file.name}`,
          creators: []
        }
      };
    }

    // 5. Failure
    console.log(`[SMART-PROCESSOR] Processing failed - insufficient information`);
    return {
      success: false,
      confidence: "Low",
      error: "Insufficient information to process file",
    };

  } catch (error) {
    console.error(`[SMART-PROCESSOR] Processing error:`, error);
    return {
      success: false,
      confidence: "Low",
      error: `Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

// Batch process multiple files
export const batchProcessFiles = async (
  files: QueuedFile[],
  comicVineApiKey: string,
  marvelPublicKey: string,
  marvelPrivateKey: string,
  gcdDbService: GcdDatabaseService | null,
  onProgress?: (processed: number, total: number, currentFile: string) => void
): Promise<Map<string, ProcessingResult>> => {
  const results = new Map<string, ProcessingResult>();
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(i, files.length, file.name);
    
    const result = await processComicFile(file, comicVineApiKey, marvelPublicKey, marvelPrivateKey, gcdDbService);
    results.set(file.id, result);
    
    // Small delay to prevent UI blocking
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  onProgress?.(files.length, files.length, "Complete");
  return results;
};

// Get processing statistics
export const getProcessingStats = (results: Map<string, ProcessingResult>) => {
  const stats = {
    total: results.size,
    successful: 0,
    highConfidence: 0,
    mediumConfidence: 0,
    lowConfidence: 0,
    failed: 0
  };

  for (const result of results.values()) {
    if (result.success) {
      stats.successful++;
      switch (result.confidence) {
        case 'High':
          stats.highConfidence++;
          break;
        case 'Medium':
          stats.mediumConfidence++;
          break;
        case 'Low':
          stats.lowConfidence++;
          break;
      }
    } else {
      stats.failed++;
    }
  }

  return stats;
};