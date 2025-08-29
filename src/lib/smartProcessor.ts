/**
 * Smart Comic File Processor
 * 
 * This module provides intelligent processing of comic files to extract and enrich metadata.
 * It combines multiple data sources and processing strategies to achieve the best possible
 * metadata detection and enrichment.
 * 
 * Processing Pipeline:
 * 1. Parse filename using intelligent patterns
 * 2. Query local GCD database (if available)
 * 3. Query Marvel API (for Marvel comics)
 * 4. Query Comic Vine API (for other publishers)
 * 5. Fall back to parsed data only
 * 
 * The processor returns confidence levels to help users understand the reliability
 * of the detected information.
 */

import { parseFilename } from "./parser";
import { QueuedFile, Confidence, Creator } from "@/types";
import { fetchComicMetadata, fetchMarvelMetadata } from "./scraper";
import { GcdDatabaseService } from "@/services/gcdDatabaseService";

/**
 * @interface ProcessingResult
 * @description Structure returned by the smart processor containing detected metadata and confidence.
 * @property {boolean} success - Whether processing succeeded.
 * @property {Confidence} confidence - How confident we are about the results ('High', 'Medium', 'Low').
 * @property {object} [data] - Detected metadata (if successful).
 * @property {string} [error] - Error message (if failed).
 */
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
    confidence: 'High' | 'Medium' | 'Low';
    source: 'knowledge' | 'api';
    title?: string;
    publicationDate?: string;
    genre?: string;
    characters?: string;
    price?: string;
    barcode?: string;
    languageCode?: string;
    countryCode?: string;
  };
  error?: string;
}

/**
 * Processes a single comic file to extract and enrich its metadata.
 * It follows a multi-stage strategy to get the most accurate data possible.
 * 
 * @param {QueuedFile} file - The file from the queue to process.
 * @param {string} comicVineApiKey - API key for the Comic Vine service.
 * @param {string} marvelPublicKey - Public API key for the Marvel service.
 * @param {string} marvelPrivateKey - Private API key for the Marvel service.
 * @param {GcdDatabaseService | null} [gcdDbService] - An optional instance of the local GCD database service.
 * @returns {Promise<ProcessingResult>} A promise that resolves with the processing result.
 */
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
    
    if (parsed.series && !parsed.issue) {
      parsed.issue = '1';
      console.log(`[SMART-PROCESSOR] No issue found, assuming issue #1 for: ${file.name}`);
    }
    
    if (!parsed.series || !parsed.issue) {
      console.log(`[SMART-PROCESSOR] Failed to parse series or issue from: ${file.name}`);
      return {
        success: false,
        confidence: "Low",
        error: "Could not extract series name or issue number from filename",
      };
    }

    // Strategy 1: Attempt GCD Database Search First (Highest Quality)
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
              publicationDate: issueDetails?.publication_date,
              genre: issueDetails?.genre,
              characters: issueDetails?.characters,
              price: (issueDetails as any)?.price,
              barcode: (issueDetails as any)?.barcode,
              languageCode: (issueDetails as any)?.language_code,
              countryCode: (issueDetails as any)?.series_country_code,
              creators: creators,
              confidence: issueDetails ? "High" : "Medium",
              source: 'knowledge'
            }
          };
        }
      } catch (error) {
        console.error(`[SMART-PROCESSOR] GCD database error:`, error);
      }
    } else {
      console.log(`[SMART-PROCESSOR] GCD database not available or not connected`);
    }

    // Strategy 2: Attempt Marvel API fetch if it's a Marvel comic
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
            publicationDate: marvelResult.data.publicationDate,
            confidence: marvelResult.data.confidence,
            source: marvelResult.data.source
          }
        };
      }
    }

    // Strategy 3: Attempt Comic Vine API fetch for other publishers
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
            creators: apiResult.data.creators,
            confidence: apiResult.data.confidence,
            source: apiResult.data.source
          }
        };
      }
    }

    // Strategy 4: Fallback to parsed data only
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
          creators: [],
          confidence: parsed.publisher ? "Medium" : "Low",
          source: 'knowledge'
        }
      };
    }

    // Strategy 5: Failure
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

/**
 * Processes an array of files sequentially with progress reporting.
 * @param {QueuedFile[]} files - Array of files to process.
 * @param {string} comicVineApiKey - Comic Vine API key.
 * @param {string} marvelPublicKey - Marvel API public key.
 * @param {string} marvelPrivateKey - Marvel API private key.
 * @param {GcdDatabaseService | null} gcdDbService - GCD database service.
 * @param {function} [onProgress] - Callback for progress updates (processed, total, currentFile).
 * @returns {Promise<Map<string, ProcessingResult>>} A map of file IDs to their processing results.
 */
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
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  onProgress?.(files.length, files.length, "Complete");
  return results;
};

/**
 * Calculates statistics from a batch processing result.
 * @param {Map<string, ProcessingResult>} results - Map of file IDs to processing results.
 * @returns {object} An object with total, successful, failed, and confidence counts.
 */
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