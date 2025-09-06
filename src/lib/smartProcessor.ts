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

import { parseFilename, ParsedComicInfo } from "./parser"; // Corrected import to include parseFilename
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
 * Processing Strategy:
 * 1. Parse filename to extract basic information
 * 2. Try local Knowledge Base lookup (highest quality, immediate)
 * 3. Try Comic Vine API
 * 4. Fall back to parsed data only
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

      if (apiResult.success && apiResult.data) {
        console.log(`[SMART-PROCESSOR] Comic Vine API success for: ${currentComicData.series} #${currentComicData.issue}`);
        // Merge API data, prioritizing API for detailed fields
        currentComicData = {
          ...currentComicData, // Keep existing data (from parsed or KB)
          ...apiResult.data, // Overlay with API data
          // Ensure series and publisher from KB/parsed are not accidentally downgraded if API returns less specific
          series: currentComicData.series,
          publisher: currentComicData.publisher,
          // Use API confidence if it's higher or more specific
          confidence: apiResult.data.confidence === 'High' ? 'High' : currentComicData.confidence,
          source: 'api'
        };
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