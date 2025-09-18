/**
 * @file Smart Comic File Processor
 * @summary Provides intelligent processing of comic files to extract and enrich metadata.
 * @description This module combines multiple data sources and processing strategies to achieve
 * the best possible metadata detection. The pipeline involves filename parsing,
 * local Knowledge Base lookups, and external API calls (Comic Vine), returning results
 * with confidence levels to guide the user.
 */

import { parseFilename } from "./parser";
import { Creator, QueuedFile, Confidence, KnowledgeBase } from "@/types";
import { fetchComicMetadata } from "./scraper";
import { ElectronAPI } from "@/hooks/useElectron";

/**
 * @interface ProcessingResult
 * @summary Defines the structure for the output of the smart processing function.
 * @property {boolean} success - Indicates if the processing was successful.
 * @property {Confidence} confidence - The confidence level of the detected metadata.
 * @property {object} [data] - The extracted and enriched metadata.
 * @property {string} [error] - An error message if processing failed.
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
    source: 'knowledge' | 'api' | 'filename';
    title?: string;
    publicationDate?: string;
    genre?: string;
    characters?: string;
    price?: string;
    barcode?: string;
    languageCode?: string;
    countryCode?: string;
    pageCount?: number;
  };
  error?: string;
}

/**
 * @function normalize
 * @summary Normalizes a string for comparison by trimming and converting to lowercase.
 * @param {string | undefined | null} s - The string to normalize.
 * @returns {string} The normalized string.
 */
const normalize = (s: string | undefined | null) => (s || "").trim().toLowerCase();

/**
 * @async
 * @function processComicFile
 * @summary The main processing function that extracts and enriches metadata for a single comic file.
 * @description This function orchestrates the metadata extraction pipeline:
 * 1. Parses the filename for initial data.
 * 2. Looks up the series in the local Knowledge Base for high-confidence data.
 * 3. Uses the best available data to query the Comic Vine API for detailed enrichment.
 * 4. Merges all data sources, prioritizing the most reliable information.
 * 5. Fetches the page count if it wasn't available initially.
 * @param {QueuedFile} file - The file to be processed.
 * @param {string} comicVineApiKey - The API key for the Comic Vine service.
 * @param {KnowledgeBase} knowledgeBase - The local knowledge base of comic series.
 * @param {ElectronAPI} [electronAPI] - The Electron API for deferred file operations (like page count).
 * @returns {Promise<ProcessingResult>} An object containing the processed data and confidence score.
 */
export const processComicFile = async (
  file: QueuedFile, 
  comicVineApiKey: string,
  knowledgeBase: KnowledgeBase,
  electronAPI?: ElectronAPI
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

    let currentComicData: ProcessingResult['data'] = {
      series: parsed.series,
      issue: parsed.issue,
      year: parsed.year || new Date().getFullYear(),
      publisher: parsed.publisher || "Unknown Publisher",
      volume: parsed.volume || String(parsed.year || new Date().getFullYear()),
      summary: `Parsed from filename: ${file.name}`,
      creators: [],
      confidence: parsed.publisher ? "Medium" : "Low",
      source: 'filename',
      pageCount: file.pageCount,
    };

    if ((currentComicData.pageCount === null || currentComicData.pageCount === undefined) && electronAPI && file.path && !file.path.startsWith('mock://')) {
      try {
        console.log(`[SMART-PROCESSOR] Fetching page count for ${file.name}...`);
        const fileInfo = await electronAPI.readComicFile(file.path);
        currentComicData.pageCount = fileInfo?.pageCount || undefined;
        console.log(`[SMART-PROCESSOR] Page count for ${file.name}: ${currentComicData.pageCount}`);
      } catch (error) {
        console.warn(`[SMART-PROCESSOR] Could not fetch page count for ${file.name}:`, error);
      }
    }

    const kbMatch = knowledgeBase.series.find(kb => normalize(kb.series) === normalize(parsed.series));
    if (kbMatch) {
      console.log(`[SMART-PROCESSOR] Found match in Knowledge Base for series: ${parsed.series}`);
      const matchingVolume = (kbMatch.volumes || []).find(v => Number(v.year) === Number(parsed.year));

      currentComicData = {
        ...currentComicData,
        series: kbMatch.series,
        publisher: kbMatch.publisher,
        year: parsed.year || kbMatch.startYear,
        volume: matchingVolume?.volume || parsed.volume || String(parsed.year || kbMatch.startYear),
        summary: `Matched from local Knowledge Base: ${kbMatch.series}`,
        confidence: "High",
        source: 'knowledge'
      };
      console.log(`[SMART-PROCESSOR] Using Knowledge Base data as foundation, now fetching Comic Vine details...`);
    } else {
      console.log(`[SMART-PROCESSOR] No Knowledge Base match found for series: ${parsed.series}`);
    }

    if (comicVineApiKey && currentComicData.series) {
      console.log(`[SMART-PROCESSOR] Attempting Comic Vine API search for: ${currentComicData.series} #${currentComicData.issue}`);
      const apiResult = await fetchComicMetadata(currentComicData, comicVineApiKey);

      console.log(`[SMART-PROCESSOR] Comic Vine returned:`, {
        success: apiResult?.success,
        summaryLength: apiResult?.data?.summary?.length || 0,
        creatorsCount: apiResult?.data?.creators?.length || 0
      });
      console.log(`[SMART-PROCESSOR] Base data summary (before API merge):`, currentComicData.summary?.substring(0, 50));
      console.log(`[SMART-PROCESSOR] Comic Vine summary:`, apiResult?.data?.summary?.substring(0, 50));

      if (apiResult.success && apiResult.data) {
        console.log(`[SMART-PROCESSOR] Comic Vine API success for: ${currentComicData.series} #${currentComicData.issue}`);
        
        currentComicData = {
          ...currentComicData,
          ...apiResult.data,
          summary: apiResult.data.summary || currentComicData.summary,
          creators: apiResult.data.creators || currentComicData.creators,
          series: currentComicData.series,
          publisher: currentComicData.publisher,
          year: currentComicData.year,
          volume: currentComicData.volume,
          confidence: apiResult.data.confidence === 'High' ? 'High' : currentComicData.confidence,
          source: 'api'
        };
        
        console.log(`[SMART-PROCESSOR] Final summary source (after API merge): ${currentComicData.summary.includes('Knowledge Base') ? 'Knowledge Base' : 'Comic Vine'}`);
        console.log(`[SMART-PROCESSOR] Final summary length (after API merge): ${currentComicData.summary?.length || 0}`);
        console.log(`[SMART-PROCESSOR] Final creators count (after API merge): ${currentComicData.creators?.length || 0}`);

      } else {
        console.log(`[SMART-PROCESSOR] Comic Vine API failed for ${currentComicData.series} #${currentComicData.issue}: ${apiResult.error || 'No data'}`);
      }
    }

    if (currentComicData.series && currentComicData.issue && currentComicData.publisher && currentComicData.year) {
      return {
        success: true,
        confidence: currentComicData.confidence,
        data: currentComicData
      };
    } else {
      return {
        success: false,
        confidence: "Low",
        error: "Insufficient information to process file after all lookups",
        data: currentComicData
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
 * @async
 * @function batchProcessFiles
 * @summary Processes multiple queued files in a batch, providing progress updates.
 * @param {QueuedFile[]} files - An array of files to process.
 * @param {string} comicVineApiKey - The API key for the Comic Vine service.
 * @param {KnowledgeBase} knowledgeBase - The local knowledge base of comic series.
 * @param {ElectronAPI | undefined} electronAPI - The Electron API for deferred file operations.
 * @param {(processed: number, total: number, currentFile: string) => void} onProgress - A callback function to report progress.
 * @returns {Promise<Map<string, ProcessingResult>>} A map of file IDs to their processing results.
 */
export const batchProcessFiles = async (
  files: QueuedFile[],
  comicVineApiKey: string,
  knowledgeBase: KnowledgeBase,
  electronAPI: ElectronAPI | undefined,
  onProgress: (processed: number, total: number, currentFile: string) => void
): Promise<Map<string, ProcessingResult>> => {
  const results = new Map<string, ProcessingResult>();
  const totalFiles = files.length;

  for (let i = 0; i < totalFiles; i++) {
    const file = files[i];
    onProgress(i + 1, totalFiles, file.name);
    const result = await processComicFile(file, comicVineApiKey, knowledgeBase, electronAPI);
    results.set(file.id, result);
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  return results;
};

/**
 * @function getProcessingStats
 * @summary Calculates statistics from a collection of processing results.
 * @param {Map<string, ProcessingResult>} results - A map of file IDs to their processing results.
 * @returns {{total: number, successful: number, failed: number, highConfidence: number, mediumConfidence: number, lowConfidence: number}} An object containing processing statistics.
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