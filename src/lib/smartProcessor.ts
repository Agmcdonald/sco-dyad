import { parseFilename, ParsedComicInfo } from "./parser";
import { searchKnowledgeBase, KnowledgeMatch } from "./knowledgeBase";
import { QueuedFile, Confidence } from "@/types";

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
  };
  suggestions?: KnowledgeMatch[];
  error?: string;
}

// Check if a file is a mock file (used for testing)
const isMockFile = (filePath: string): boolean => {
  return filePath.startsWith('mock://');
};

// Smart processor that combines parsing with knowledge base matching
export const processComicFile = async (file: QueuedFile): Promise<ProcessingResult> => {
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

    // Search knowledge base for matches
    const knowledgeMatches = searchKnowledgeBase(parsed);
    
    if (knowledgeMatches.length > 0) {
      const bestMatch = knowledgeMatches[0];
      
      // Use knowledge base data to fill in missing information
      const processedData = {
        series: bestMatch.series, // Use canonical series name
        issue: parsed.issue,
        year: parsed.year || bestMatch.startYear,
        publisher: parsed.publisher || bestMatch.publisher, // Prefer character-detected publisher
        volume: bestMatch.volume,
        summary: isMockFile(file.path) 
          ? `Mock file processed using knowledge base: ${bestMatch.series} published by ${parsed.publisher || bestMatch.publisher}`
          : `Processed using knowledge base: ${bestMatch.series} published by ${parsed.publisher || bestMatch.publisher}`
      };

      return {
        success: true,
        confidence: bestMatch.confidence,
        data: processedData,
        suggestions: knowledgeMatches.slice(1, 4) // Additional suggestions
      };
    }

    // Fallback: use parsed data if available
    if (parsed.year && parsed.publisher) {
      return {
        success: true,
        confidence: "Medium", // Higher confidence if we detected the publisher
        data: {
          series: parsed.series,
          issue: parsed.issue,
          year: parsed.year,
          publisher: parsed.publisher,
          volume: parsed.volume || String(parsed.year),
          summary: isMockFile(file.path)
            ? `Mock file parsed with character-based publisher detection: ${file.name}`
            : `Parsed from filename with character-based publisher detection: ${file.name}`
        }
      };
    } else if (parsed.year) {
      return {
        success: true,
        confidence: "Low",
        data: {
          series: parsed.series,
          issue: parsed.issue,
          year: parsed.year,
          publisher: parsed.publisher || "Unknown Publisher",
          volume: parsed.volume || String(parsed.year),
          summary: isMockFile(file.path)
            ? `Mock file parsed from filename: ${file.name}`
            : `Parsed from filename: ${file.name}`
        }
      };
    }

    // Not enough information
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
  onProgress?: (processed: number, total: number, currentFile: string) => void
): Promise<Map<string, ProcessingResult>> => {
  const results = new Map<string, ProcessingResult>();
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(i, files.length, file.name);
    
    const result = await processComicFile(file);
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