/**
 * Smart Comic File Processor
 * 
 * This module provides intelligent processing of comic files to extract and enrich metadata.
 * It combines multiple data sources and processing strategies to achieve the best possible
 * metadata detection and enrichment.
 * 
 * Processing Pipeline:
 * 1. Parse filename using intelligent patterns
 * 2. Query local Knowledge Base (for known series/publishers)
 * 3. Query local GCD database (if available)
 * 4. Query Marvel API (for Marvel comics)
 * 5. Query Comic Vine API (for other publishers)
 * 6. Fall back to parsed data only
 * 
 * The processor returns confidence levels to help users understand the reliability
 * of the detected information.
 */

import { parseFilename } from "./parser";
import { QueuedFile, Confidence, Creator, KnowledgeBase } from "@/types";
import { fetchComicMetadata, fetchMarvelMetadata } from "./scraper";
import { GcdDatabaseService } from "@/services/gcdDatabaseService";

/**
 * Processing Result Interface
 * Structure returned by the smart processor containing detected metadata and confidence
 */
export interface ProcessingResult {
  success: boolean;           // Whether processing succeeded
  confidence: Confidence;     // How confident we are about the results
  data?: {                   // Detected metadata (if successful)
    series: string;
    issue: string;
    year: number;
    publisher: string;
    volume: string;
    summary: string;
    creators?: Creator[];
    confidence: 'High' | 'Medium' | 'Low';
    source: 'knowledge' | 'api' | 'filename';  // Where the data came from
    
    // Extended metadata fields
    title?: string;           // Specific issue title
    publicationDate?: string; // Exact publication date
    genre?: string;           // Genre classification
    characters?: string;      // Featured characters
    price?: string;           // Cover price
    barcode?: string;         // UPC barcode
    languageCode?: string;    // Language code
    countryCode?: string;     // Country code
  };
  error?: string;            // Error message (if failed)
}

const normalize = (s: string | undefined | null) => (s || "").trim().toLowerCase();

/**
 * Process Comic File
 * Main processing function that attempts to extract and enrich metadata for a comic file
 * 
 * Processing Strategy:
 * 1. Parse filename to extract basic information
 * 2. Try local Knowledge Base lookup (highest quality, immediate)
 * 3. Try GCD database lookup (highest quality, offline)
 * 4. Try Marvel API (for Marvel comics)
 * 5. Try Comic Vine API (for other publishers)
 * 6. Fall back to parsed data only
 * 
 * @param file - QueuedFile to process
 * @param comicVineApiKey - Comic Vine API key
 * @param marvelPublicKey - Marvel API public key
 * @param marvelPrivateKey - Marvel API private key
 * @param gcdDbService - Grand Comics Database service (optional)
 * @param knowledgeBase - Local knowledge base for series/publishers
 * @returns ProcessingResult with detected metadata and confidence
 */
export const processComicFile = async (
  file: QueuedFile, 
  comicVineApiKey: string,
  marvelPublicKey: string,
  marvelPrivateKey: string,
  gcdDbService: GcdDatabaseService | null, // Can be null now
  knowledgeBase: KnowledgeBase
): Promise<ProcessingResult> => {
  try {
    console.log(`[SMART-PROCESSOR] Processing file: ${file.name}`);
    const parsed = parseFilename(file.path);
    console.log(`[SMART-PROCESSOR] Parsed data:`, parsed);
    
    // If no issue number detected, assume it's issue #1
    if (parsed.series && !parsed.issue) {
      parsed.issue = '1';
      console.log(`[SMART-PROCESSOR] No issue found, assuming issue #1 for: ${file.name}`);
    }
    
    // Require at minimum a series name and issue number
    if (!parsed.series || !parsed.issue) {
      console.log(`[SMART-PROCESSOR] Failed to parse series or issue from: ${file.name}`);
      return {
        success: false,
        confidence: "Low",
        error: "Could not extract series name or issue number from filename",
      };
    }

    // 1. Attempt Knowledge Base Lookup First (Highest Priority)
    const kbMatch = knowledgeBase.series.find(kb => normalize(kb.series) === normalize(parsed.series));
    if (kbMatch) {
      console.log(`[SMART-PROCESSOR] Found match in Knowledge Base for series: ${parsed.series}`);
      const matchingVolume = (kbMatch.volumes || []).find(v => Number(v.year) === Number(parsed.year));
      return {
        success: true,
        confidence: "High",
        data: {
          series: kbMatch.series,
          issue: parsed.issue,
          year: parsed.year || kbMatch.startYear,
          publisher: kbMatch.publisher,
          volume: matchingVolume?.volume || parsed.volume || String(parsed.year || kbMatch.startYear),
          summary: `Matched from local Knowledge Base: ${kbMatch.series}`,
          creators: [], // Knowledge base doesn't store creators directly for series
          confidence: "High",
          source: 'knowledge'
        }
      };
    }

    // 2. Attempt GCD Database Search (if service is provided)
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
              source: 'knowledge' // GCD is considered knowledge
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

    // 3. Attempt Marvel API fetch if it's a Marvel comic (or parsed publisher suggests it)
    if ((parsed.publisher?.toLowerCase() === 'marvel comics' || (kbMatch && normalize(kbMatch.publisher) === 'marvel comics')) && marvelPublicKey && marvelPrivateKey) {
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

    // 4. Attempt Comic Vine API fetch for other publishers
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

    // 5. Fallback to parsed data only
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
          source: 'filename'
        }
      };
    }

    // 6. Failure
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
 * Batch Process Multiple Files
 * Processes an array of files sequentially with progress reporting
 * 
 * @param files - Array of QueuedFile to process
 * @param comicVineApiKey - Comic Vine API key
 * @param marvelPublicKey - Marvel API public key
 * @param marvelPrivateKey - Marvel API private key
 * @param gcdDbService - GCD database service
 * @param knowledgeBase - Local knowledge base for series/publishers
 * @param onProgress - Callback function for progress updates
 * @returns A map of file IDs to their processing results
 */
export const batchProcessFiles = async (
  files: QueuedFile[],
  comicVineApiKey: string,
  marvelPublicKey: string,
  marvelPrivateKey: string,
  gcdDbService: GcdDatabaseService | null,
  knowledgeBase: KnowledgeBase,
  onProgress?: (processed: number, total: number, currentFile: string) => void
): Promise<Map<string, ProcessingResult>> => {
  const results = new Map<string, ProcessingResult>();
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(i, files.length, file.name);
    
    const result = await processComicFile(file, comicVineApiKey, marvelPublicKey, marvelPrivateKey, gcdDbService, knowledgeBase);
    results.set(file.id, result);
    
    // Small delay to prevent UI blocking and API rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  onProgress?.(files.length, files.length, "Complete");
  return results;
};

/**
 * Get Processing Statistics
 * Calculates statistics from a batch processing result
 * 
 * @param results - Map of file IDs to processing results
 * @returns An object with total, successful, failed, and confidence counts
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