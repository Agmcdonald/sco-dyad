/**
 * Comic Vine Processing Service
 * 
 * This service handles the intelligent processing of comics with Comic Vine API integration,
 * including rate limiting (200 requests/hour), queue management, and retry logic.
 */

import { Comic, QueuedFile } from "@/types";
import { fetchComicMetadata } from "@/lib/scraper";
import { useElectronDatabaseService } from "@/services/electronDatabaseService";

export interface ComicVineQueueStatus {
  isProcessing: boolean;
  queueSize: number;
  requestsRemaining: number;
  nextResetTime?: string;
  stats: {
    pending: number;
    fetched: number;
    failed: number;
    skipped: number;
  };
}

export interface ComicVineProcessingOptions {
  maxConcurrent?: number;
  delayBetweenRequests?: number;
  retryFailedAfterHours?: number;
}

class ComicVineService {
  private isProcessing = false;
  private processingQueue: Comic[] = [];
  private abortController: AbortController | null = null;
  private options: ComicVineProcessingOptions = {
    maxConcurrent: 1, // Process one at a time to avoid overwhelming API
    delayBetweenRequests: 2000, // 2 second delay between requests
    retryFailedAfterHours: 24 // Retry failed requests after 24 hours
  };

  constructor() {
    // No longer initialize database service here
  }

  /**
   * Get current Comic Vine processing status
   */
  async getStatus(databaseService?: any): Promise<ComicVineQueueStatus> {
    if (!databaseService?.getComicVineStats) {
      return {
        isProcessing: false,
        queueSize: 0,
        requestsRemaining: 200,
        stats: { pending: 0, fetched: 0, failed: 0, skipped: 0 }
      };
    }

    const stats = await databaseService.getComicVineStats();
    const rateLimit = await databaseService.checkRateLimit();
    
    return {
      isProcessing: this.isProcessing,
      queueSize: this.processingQueue.length,
      requestsRemaining: rateLimit.requestsRemaining || 0,
      nextResetTime: rateLimit.nextReset,
      stats
    };
  }

  /**
   * Start processing comics that need Comic Vine data
   */
  async startProcessing(apiKey: string, databaseService: any, onProgress?: (progress: { processed: number; total: number; current?: string }) => void): Promise<void> {
    if (this.isProcessing) {
      console.log('[COMIC-VINE-SERVICE] Processing already in progress');
      return;
    }

    if (!apiKey) {
      throw new Error('Comic Vine API key is required');
    }

    if (!databaseService) {
      throw new Error('Database service not available');
    }

    this.isProcessing = true;
    this.abortController = new AbortController();
    
    try {
      console.log('[COMIC-VINE-SERVICE] Starting Comic Vine processing...');
      
      // Get comics that need processing
      const comicsToProcess = await databaseService.getComicsForComicVineProcessing(50);
      console.log(`[COMIC-VINE-SERVICE] Found ${comicsToProcess.length} comics to process`);
      
      if (comicsToProcess.length === 0) {
        console.log('[COMIC-VINE-SERVICE] No comics need Comic Vine processing');
        this.isProcessing = false;
        return;
      }

      this.processingQueue = comicsToProcess;
      let processed = 0;
      let updated = 0;

      for (const comic of comicsToProcess) {
        if (this.abortController.signal.aborted) {
          console.log('[COMIC-VINE-SERVICE] Processing aborted');
          break;
        }

        // Check rate limit before each request
        const rateLimit = await databaseService.checkRateLimit();
        if (!rateLimit.canProceed) {
          console.log('[COMIC-VINE-SERVICE] Rate limit reached, stopping processing');
          break;
        }

        // Update progress
        onProgress?.({ 
          processed, 
          total: comicsToProcess.length, 
          current: `${comic.series} #${comic.issue}` 
        });

        try {
          const wasUpdated = await this.processComic(comic, apiKey, databaseService);
          if (wasUpdated) updated++;
          
          // Increment rate limit counter
          await databaseService.incrementRateLimit();
          
        } catch (error) {
          console.error(`[COMIC-VINE-SERVICE] Error processing ${comic.series} #${comic.issue}:`, error);
          
          // Mark as failed with retry timer
          const retryAfter = new Date();
          retryAfter.setHours(retryAfter.getHours() + this.options.retryFailedAfterHours!);
          
          await databaseService.updateComicVineStatus(
            comic.id, 
            'failed', 
            null, 
            retryAfter.toISOString()
          );
        }

        processed++;
        
        // Delay between requests to be respectful to API
        if (processed < comicsToProcess.length && !this.abortController.signal.aborted) {
          await this.delay(this.options.delayBetweenRequests!);
        }
      }

      console.log(`[COMIC-VINE-SERVICE] Processing complete. Updated ${updated} of ${processed} comics.`);
      
    } finally {
      this.isProcessing = false;
      this.processingQueue = [];
      this.abortController = null;
    }
  }

  /**
   * Stop current processing
   */
  stopProcessing(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.isProcessing = false;
  }

  /**
   * Process a single comic with Comic Vine
   */
  async processComic(comic: Comic, apiKey: string, databaseService: any): Promise<boolean> {
    if (!databaseService) {
      throw new Error('Database service not available');
    }

    console.log(`[COMIC-VINE-SERVICE] Processing: ${comic.series} #${comic.issue}`);

    // Create a temporary QueuedFile-like object for the scraper
    const tempFile: any = {
      series: comic.series,
      issue: comic.issue,
      year: comic.year,
      publisher: comic.publisher,
      volume: comic.volume
    };

    try {
      const result = await fetchComicMetadata(tempFile, apiKey);
      
      if (result.success && result.data) {
        // Only update fields that have new/better data
        const updates: Partial<Comic> = { id: comic.id };
        let hasUpdates = false;

        // Summary - prioritize Comic Vine over local/placeholder data
        if (result.data.summary && result.data.summary.length > 50 && 
            (!comic.summary || comic.summary.includes('Matched from local Knowledge Base') || comic.summary.includes('Parsed from filename'))) {
          updates.summary = result.data.summary;
          hasUpdates = true;
        }

        // Creators - update if we don't have any or have very few
        if (result.data.creators && result.data.creators.length > 0 && 
            (!comic.creators || comic.creators.length === 0)) {
          updates.creators = result.data.creators;
          hasUpdates = true;
        }

        // Publisher - update if current is "Unknown Publisher"
        if (result.data.publisher && comic.publisher === "Unknown Publisher") {
          updates.publisher = result.data.publisher;
          hasUpdates = true;
        }

        // Other metadata fields - update if missing
        if (result.data.title && !comic.title) {
          updates.title = result.data.title;
          hasUpdates = true;
        }
        if (result.data.publicationDate && !comic.publicationDate) {
          updates.publicationDate = result.data.publicationDate;
          hasUpdates = true;
        }
        if (result.data.genre && !comic.genre) {
          updates.genre = result.data.genre;
          hasUpdates = true;
        }
        if (result.data.characters && !comic.characters) {
          updates.characters = result.data.characters;
          hasUpdates = true;
        }
        if (result.data.price && !comic.price) {
          updates.price = result.data.price;
          hasUpdates = true;
        }
        if (result.data.barcode && !comic.barcode) {
          updates.barcode = result.data.barcode;
          hasUpdates = true;
        }

        // Update the comic if we have new data
        if (hasUpdates) {
          // Separate creators from other updates since they need special handling
          const { creators, ...otherUpdates } = updates;
          
          // Create the updated comic, filtering out any undefined values
          const updatedComic = {
            ...comic,
            ...Object.fromEntries(
              Object.entries(otherUpdates).filter(([_, value]) => value !== undefined)
            )
          };
          
          // If we have creators to update, include them
          if (creators) {
            updatedComic.creators = creators;
          }
          
          // Ensure dateAdded is a Date object for the database
          if (typeof updatedComic.dateAdded === 'string') {
            updatedComic.dateAdded = new Date(updatedComic.dateAdded);
          }
          
          await databaseService.updateComic(updatedComic);
          console.log(`[COMIC-VINE-SERVICE] Updated: ${comic.series} #${comic.issue} with new data`);
        }

        // Mark as successfully fetched
        await databaseService.updateComicVineStatus(
          comic.id, 
          'fetched', 
          new Date().toISOString(), 
          null
        );

        return hasUpdates;
      } else {
        // Mark as failed but don't retry immediately
        await databaseService.updateComicVineStatus(
          comic.id, 
          'failed', 
          null, 
          null
        );
        console.log(`[COMIC-VINE-SERVICE] Failed to fetch data for: ${comic.series} #${comic.issue}`);
        return false;
      }
    } catch (error) {
      console.error(`[COMIC-VINE-SERVICE] Error processing ${comic.series} #${comic.issue}:`, error);
      throw error;
    }
  }

  /**
   * Process a single comic immediately (for manual "Scan for Details")
   */
  async processSingleComic(comic: Comic, apiKey: string, databaseService: any): Promise<{ success: boolean; updated: boolean; message: string }> {
    if (!databaseService) {
      return { success: false, updated: false, message: 'Database service not available' };
    }

    // Check rate limit
    const rateLimit = await databaseService.checkRateLimit();
    if (!rateLimit.canProceed) {
      return { 
        success: false, 
        updated: false, 
        message: `Rate limit reached. ${rateLimit.requestsRemaining} requests remaining. Next reset: ${new Date(rateLimit.nextReset!).toLocaleTimeString()}` 
      };
    }

    try {
      const updated = await this.processComic(comic, apiKey, databaseService);
      await databaseService.incrementRateLimit();
      
      return {
        success: true,
        updated,
        message: updated ? 'Comic updated with new metadata' : 'No new metadata found'
      };
    } catch (error) {
      return {
        success: false,
        updated: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Reset Comic Vine status for selected comics (to reprocess them)
   */
  async resetComicVineStatus(comicIds: string[], databaseService: any): Promise<void> {
    if (!databaseService) {
      throw new Error('Database service not available');
    }

    for (const comicId of comicIds) {
      await databaseService.updateComicVineStatus(comicId, 'pending', null, null);
    }
  }

  /**
   * Skip Comic Vine processing for selected comics
   */
  async skipComicVineProcessing(comicIds: string[], databaseService: any): Promise<void> {
    if (!databaseService) {
      throw new Error('Database service not available');
    }

    for (const comicId of comicIds) {
      await databaseService.updateComicVineStatus(comicId, 'skipped', null, null);
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export a singleton instance
export const comicVineService = new ComicVineService();
export default comicVineService;
