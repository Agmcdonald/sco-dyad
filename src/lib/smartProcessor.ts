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
 * 3. Query Comic Vine API
 * 4. Fall back to parsed data only
 * 
 * The processor returns confidence levels to help users understand the reliability
 * of the detected information.
 */

import { parseFilename, ParsedComicInfo } from "./parser";
import { Creator, QueuedFile, Confidence, KnowledgeBase } from "@/types";
import { fetchComicMetadata } from "./scraper";
import { GcdDatabaseService } from "@/services/gcdDatabaseService"; // Keep import for type, but won't be used

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
 * @param file - QueuedFile to process
 * @param comicVineApiKey - Comic Vine API key
 * @param knowledgeBase - Local knowledge base for series/publishers
 * @returns ProcessingResult with detected metadata and confidence
 */
export const processComicFile = async (
  file: QueuedFile, 
  comicVineApiKey: string,
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

    // Initialize base data with parsed info
    let currentComicData: ProcessingResult['data'] = {
      series: parsed.series,
      issue: parsed.issue,
      year: parsed.year || new Date().getFullYear(),
      publisher: parsed.publisher || "Unknown Publisher",
      volume: parsed.volume || String(parsed.year || new Date().getFullYear()),
      summary: `Parsed from filename: ${file.name}`,
      creators: [],
      confidence: parsed.publisher ? "Medium" : "Low",
      source: 'filename'
    };

    // 1. Attempt Knowledge Base Lookup
    const kbMatch = knowledgeBase.series.find(kb => normalize(kb.series) === normalize(parsed.series));
    if (kbMatch) {
      console.log(`[SMART-PROCESSOR] Found match in Knowledge Base for series: ${parsed.series}`);
      const matchingVolume = (kbMatch.volumes || []).find(v => Number(v.year) === Number(parsed.year));

      currentComicData = {
        ...currentComicData, // Keep existing parsed data
        series: kbMatch.series, // Override with KB series name
        publisher: kbMatch.publisher, // Override with KB publisher
        year: parsed.year || kbMatch.startYear, // Prefer parsed year, fallback to KB start year
        volume: matchingVolume?.volume || parsed.volume || String(parsed.year || kbMatch.startYear), // Prefer parsed volume, then KB volume, then KB start year
        summary: `Matched from local Knowledge Base: ${kbMatch.series}`,
        creators: [], // Reset creators as KB doesn't store them
        confidence: "High",
        source: 'knowledge'
      };
      console.log(`[SMART-PROCESSOR] Using Knowledge Base data as foundation, now fetching Comic Vine details...`);
    } else {
      console.log(`[SMART-PROCESSOR] No Knowledge Base match found for series: ${parsed.series}`);
    }

    // 2. ALWAYS Attempt Comic Vine API fetch for enrichment
    if (comicVineApiKey && currentComicData.series) {
      console.log(`[SMART-PROCESSOR] Attempting Comic Vine API search for: ${currentComicData.series} #${currentComicData.issue}`);
      // Pass currentComicData to fetchComicMetadata so it can use the best available series/publisher/year
      const apiResult = await fetchComicMetadata(currentComicData, comicVineApiKey);

      // --- DEBUG LOGGING START ---
      console.log(`[SMART-PROCESSOR] Comic Vine returned:`, {
        success: apiResult?.success,
        summaryLength: apiResult?.data?.summary?.length || 0,
        creatorsCount: apiResult?.data?.creators?.length || 0
      });
      console.log(`[SMART-PROCESSOR] Base data summary (before API merge):`, currentComicData.summary?.substring(0, 50));
      console.log(`[SMART-PROCESSOR] Comic Vine summary:`, apiResult?.data?.summary?.substring(0, 50));
      // --- DEBUG LOGGING END ---

      if (apiResult.success && apiResult.data) {
        console.log(`[SMART-PROCESSOR] Comic Vine API success for: ${currentComicData.series} #${currentComicData.issue}`);
        
        // Merge API data, but be explicit about what takes precedence
        const mergedData = {
          // Start with current data as base
          ...currentComicData,
          
          // Override with all API data fields
          ...apiResult.data,
          
          // Explicitly set fields that should come from API if available
          summary: apiResult.data.summary && apiResult.data.summary.length > 0 
            ? apiResult.data.summary 
            : currentComicData.summary,
          
          creators: apiResult.data.creators && apiResult.data.creators.length > 0
            ? apiResult.data.creators
            : currentComicData.creators || [],
          
          // These fields should preserve local/KB data if better
          series: apiResult.data.series || currentComicData.series,
          publisher: apiResult.data.publisher || currentComicData.publisher,
          year: apiResult.data.year || currentComicData.year,
          volume: apiResult.data.volume || currentComicData.volume,
          
          // Extended metadata from API
          title: apiResult.data.title,
          characters: apiResult.data.characters,
          genre: apiResult.data.genre,
          publicationDate: apiResult.data.publicationDate,
          
          // Set confidence and source
          confidence: apiResult.data.confidence === 'High' ? 'High' : currentComicData.confidence,
          source: 'api' as const
        };
        
        // Assign the merged data
        currentComicData = mergedData;
        
        // --- DEBUG LOGGING AFTER MERGE ---
        console.log(`[SMART-PROCESSOR] After merge - Summary:`, currentComicData.summary?.substring(0, 100));
        console.log(`[SMART-PROCESSOR] After merge - Summary length:`, currentComicData.summary?.length || 0);
        console.log(`[SMART-PROCESSOR] After merge - Creators count:`, currentComicData.creators?.length || 0);
        console.log(`[SMART-PROCESSOR] After merge - First creator:`, currentComicData.creators?.[0]);
        console.log(`[SMART-PROCESSOR] After merge - Characters:`, currentComicData.characters);
        // --- DEBUG LOGGING AFTER MERGE ---

      } else {
        console.log(`[SMART-PROCESSOR] Comic Vine API failed for ${currentComicData.series} #${currentComicData.issue}: ${apiResult.error || 'No data'}`);
      }
    }

    // Final check for confidence and success
    if (currentComicData.series && currentComicData.issue && currentComicData.publisher && currentComicData.year) {
      return {
        success: true,
        confidence: currentComicData.confidence,
        data: currentComicData
      };
    } else {
      // If after all attempts, essential data is still missing
      return {
        success: false,
        confidence: "Low",
        error: "Insufficient information to process file after all lookups",
        data: currentComicData // Return partial data for manual review
      };
    }

  } catch (error) {
    console.error(`[SMART-PROCESSOR] Processing error for ${file.name}:`, error);
    return {
      success: false,
      confidence: "Low",
      error: `Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Batch Process Files
 * Processes multiple queued files in a batch, updating progress via a callback.
 * @param files - Array of QueuedFile objects to process
 * @param comicVineApiKey - Comic Vine API key
 * @param knowledgeBase - Local knowledge base for series/publishers
 * @param onProgress - Callback for progress updates (processed count, total count, current file name)
 * @returns A Map of fileId to ProcessingResult
 */
export const batchProcessFiles = async (
  files: QueuedFile[],
  comicVineApiKey: string,
  knowledgeBase: KnowledgeBase,
  onProgress: (processed: number, total: number, currentFile: string) => void
): Promise<Map<string, ProcessingResult>> => {
  const results = new Map<string, ProcessingResult>();
  const totalFiles = files.length;

  for (let i = 0; i < totalFiles; i++) {
    const file = files[i];
    onProgress(i + 1, totalFiles, file.name);
    const result = await processComicFile(file, comicVineApiKey, knowledgeBase);
    results.set(file.id, result);
    await new Promise(resolve => setTimeout(resolve, 50)); // Small delay to prevent API rate limits and UI freezing
  }

  return results;
};

/**
 * Get Processing Statistics
 * Calculates statistics from a map of processing results.
 * @param results - Map of fileId to ProcessingResult
 * @returns Object with counts for total, successful, failed, and confidence levels
 */
export const getProcessingStats = (results: Map<string, ProcessingResult>) => {
  let successful = 0;
  let failed = 0;
  let highConfidence = 0;
  let mediumConfidence = 0;
  let lowConfidence = 0;

  results.forEach(result => {
    if (result.success) {
      successful++;
    } else {
      failed++;
    }

    switch (result.confidence) {
      case 'High':
        highConfidence++;
        break;
      case 'Medium':
        mediumConfidence++;
        break;
      case 'Low':
        lowConfidence++;
        break;
    }
  });

  return {
    total: results.size,
    successful,
    failed,
    highConfidence,
    mediumConfidence,
    lowConfidence,
  };
};