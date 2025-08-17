import { parseFilename } from "./parser";
import { searchKnowledgeBase, KnowledgeMatch } from "./knowledgeBase";
import { QueuedFile, Confidence, Creator } from "@/types";
import { fetchComicMetadata, fetchMarvelMetadata } from "./scraper";

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
  };
  suggestions?: KnowledgeMatch[];
  error?: string;
}

// Check if a file is a mock file (used for testing)
const isMockFile = (filePath: string): boolean => {
  return filePath.startsWith('mock://');
};

// Smart processor that combines parsing with knowledge base matching
export const processComicFile = async (
  file: QueuedFile, 
  comicVineApiKey: string,
  marvelPublicKey: string,
  marvelPrivateKey: string
): Promise<ProcessingResult> => {
  try {
    // Parse the filename (works for both real and mock files)
    const parsed = parseFilename(file.path);
    
    // Check if we have minimum required information
    if (!parsed.series || !parsed.issue) {
      return {
        success: false,
        confidence: "Low",
        error: "Could not extract series name or issue number from filename",
        suggestions: []
      };
    }

    // 1. Attempt Marvel API fetch first if it's a Marvel comic
    if (parsed.publisher?.toLowerCase() === 'marvel comics' && marvelPublicKey && marvelPrivateKey) {
      const marvelResult = await fetchMarvelMetadata(parsed, marvelPublicKey, marvelPrivateKey);
      if (marvelResult.success && marvelResult.data) {
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

    // 2. Attempt Comic Vine API fetch for other publishers
    if (comicVineApiKey) {
      const apiResult = await fetchComicMetadata(parsed, comicVineApiKey);
      if (apiResult.success && apiResult.data) {
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

    // 3. Fallback to Knowledge Base
    const knowledgeMatches = searchKnowledgeBase(parsed);
    if (knowledgeMatches.length > 0) {
      const bestMatch = knowledgeMatches[0];
      return {
        success: true,
        confidence: bestMatch.confidence,
        data: {
          series: bestMatch.series,
          issue: parsed.issue,
          year: parsed.year || bestMatch.startYear,
          publisher: parsed.publisher || bestMatch.publisher,
          volume: bestMatch.volume,
          summary: `Processed using knowledge base: ${bestMatch.series}`,
          creators: []
        },
        suggestions: knowledgeMatches.slice(1, 4)
      };
    }

    // 4. Fallback to parsed data only
    if (parsed.year) {
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
    return {
      success: false,
      confidence: "Low",
      error: "Insufficient information to process file",
      suggestions: knowledgeMatches
    };

  } catch (error) {
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
  onProgress?: (processed: number, total: number, currentFile: string) => void
): Promise<Map<string, ProcessingResult>> => {
  const results = new Map<string, ProcessingResult>();
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(i, files.length, file.name);
    
    const result = await processComicFile(file, comicVineApiKey, marvelPublicKey, marvelPrivateKey);
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