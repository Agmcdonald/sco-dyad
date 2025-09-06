/**
 * API Scraper for Comic Vine
 * 
 * This module handles fetching metadata from the Comic Vine API.
 * It replaces the previous mock implementation with actual HTTP requests.
 * 
 * This allows for real-time enrichment of comic book data, provided the user
 * has supplied a valid API key in the application settings.
 */

import { ParsedComicInfo } from "./parser";
import { Creator } from "@/types";

const API_BASE_URL = "https://comicvine.gamespot.com/api";

/**
 * Scraper Result Interface
 * Defines the structure of the response from a scraper function
 */
interface ScraperResult {
    success: boolean;
    data?: {
        publisher: string;
        volume: string;
        summary: string;
        creators: Creator[];
        confidence: 'High' | 'Medium' | 'Low';
        source: 'knowledge' | 'api';
        title?: string;
        publicationDate?: string;
        series?: string; // Canonical series name from API
    };
    error?: string;
}

// Helper to strip HTML tags from descriptions
const stripHtml = (html: string | null | undefined): string => {
    if (!html) return '';
    return html.replace(/<[^>]*>?/gm, '');
};

/**
 * Fetch Comic Metadata (from Comic Vine)
 * Fetches data from the Comic Vine API via the Electron main process to bypass CORS.
 * 
 * @param parsed - Parsed comic information from filename
 * @param apiKey - API key for Comic Vine
 * @returns ScraperResult with comic data
 */
export const fetchComicMetadata = async (
    parsed: ParsedComicInfo,
    apiKey: string
): Promise<ScraperResult> => {
    console.log(`[COMIC-VINE-SCRAPER] Starting fetch for:`, parsed);

    const electronAPI = window.electronAPI;
    if (!electronAPI) {
        console.error("[COMIC-VINE-SCRAPER] Electron API not available.");
        return { success: false, error: "This feature is only available in the desktop application." };
    }

    if (!apiKey) {
        console.error("[COMIC-VINE-SCRAPER] API Key is missing.");
        return { success: false, error: "Comic Vine API Key is missing. Please set it in Settings." };
    }
    if (!parsed.series || !parsed.issue) {
        console.error("[COMIC-VINE-SCRAPER] Series or issue number is missing for API lookup.");
        return { success: false, error: "Series or issue number is missing for API lookup." };
    }

    try {
        // Step 1: Search for the volume using the parsed series name (preserving hyphens)
        const volumeSearchQuery = parsed.series; // Use parsed.series directly
        const volumeSearchUrl = `${API_BASE_URL}/search/?api_key=${apiKey}&format=json&query=${encodeURIComponent(volumeSearchQuery)}&resources=volume&field_list=name,start_year,publisher,id`;
        console.log(`[COMIC-VINE-SCRAPER] Volume search URL: ${volumeSearchUrl}`);
        
        const volumeResponse = await electronAPI.fetchComicVine(volumeSearchUrl);
        
        if (!volumeResponse.success) {
            throw new Error(volumeResponse.error || `Volume API request failed`);
        }
        const volumeData = volumeResponse.data;
        console.log(`[COMIC-VINE-SCRAPER] Volume search raw response:`, volumeData);

        if (volumeData.status_code !== 1 || volumeData.number_of_total_results === 0) {
            console.warn(`[COMIC-VINE-SCRAPER] No volume found for "${volumeSearchQuery}"`);
            return { success: false, error: `No volume found for "${volumeSearchQuery}"` };
        }

        const volumes = volumeData.results;
        console.log(`[COMIC-VINE-SCRAPER] Found ${volumes.length} volumes for "${parsed.series}"`);

        // Debug: Show all available volumes
        volumes.forEach((vol: any, index: number) => {
          console.log(`  ${index + 1}. "${vol.name}" (${vol.start_year}) - ${vol.publisher?.name || 'Unknown Publisher'}`);
        });

        // Score each volume based on multiple criteria
        const scoredVolumes = volumes.map((volume: any) => {
          let score = 0;
          const volumeName = volume.name?.toLowerCase() || '';
          const searchSeries = parsed.series.toLowerCase();
          const volumeYear = parseInt(volume.start_year) || 0;
          const searchYear = parsed.year || 0;
          
          // 1. Name matching (most important - up to 60 points)
          if (volumeName === searchSeries) {
            score += 60; // Exact match
          } else if (volumeName.includes(searchSeries)) {
            score += 50; // Contains search term
          } else if (searchSeries.includes(volumeName)) {
            score += 40; // Search term contains volume name
          } else {
            // Check for partial matches (like "A-Force" vs "A-Force (2015)")
            const cleanVolumeName = volumeName.replace(/\s*\([^)]*\)/, '').trim(); // Remove parentheses
            const cleanSearchSeries = searchSeries.replace(/\s*\([^)]*\)/, '').trim();
            
            if (cleanVolumeName === cleanSearchSeries) {
              score += 55; // Match without parenthetical info
            } else if (cleanVolumeName.includes(cleanSearchSeries) || cleanSearchSeries.includes(cleanVolumeName)) {
              score += 35; // Partial match
            }
          }
          
          // 2. Publisher matching (up to 25 points)
          const publisherName = volume.publisher?.name?.toLowerCase() || '';
          const searchPublisher = parsed.publisher?.toLowerCase() || '';
          
          if (publisherName && searchPublisher) {
            if (publisherName.includes(searchPublisher) || searchPublisher.includes(publisherPublisher)) {
              score += 25; // Publisher match
            }
          } else if (publisherName) {
            // Boost known major publishers
            if (publisherName.includes('marvel')) score += 10;
            if (publisherName.includes('dc')) score += 10;
            if (publisherName.includes('image')) score += 8;
            if (publisherName.includes('dark horse')) score += 8;
          }
          
          // 3. Year proximity (up to 20 points)
          if (volumeYear && searchYear) {
            const yearDiff = Math.abs(volumeYear - searchYear);
            if (yearDiff === 0) score += 20; // Exact year match
            else if (yearDiff === 1) score += 15; // 1 year off
            else if (yearDiff <= 2) score += 10; // 2 years off
            else if (yearDiff <= 5) score += 5;  // 5 years off
            // No points for more than 5 years difference
          }
          
          // 4. Prefer newer/active series (up to 10 points)
          if (volumeYear >= 2010) score += 10;
          else if (volumeYear >= 2000) score += 5;
          
          return { 
            ...volume, 
            score,
            matchDetails: {
              nameMatch: volumeName.includes(searchSeries) || searchSeries.includes(volumeName),
              publisherMatch: publisherName.includes(searchPublisher) || searchPublisher.includes(volumePublisher),
              yearDiff: volumeYear ? Math.abs(volumeYear - searchYear) : 999
            }
          };
        });

        // Sort by score (highest first)
        scoredVolumes.sort((a: any, b: any) => b.score - a.score);

        // Debug: Show scoring results
        console.log(`[COMIC-VINE-SCRAPER] Volume scoring results for "${parsed.series}":`);
        scoredVolumes.slice(0, 5).forEach((vol: any, index: number) => {
          console.log(`  ${index + 1}. "${vol.name}" (${vol.start_year}) - Score: ${vol.score} - ${vol.publisher?.name || 'Unknown'}`);
          console.log(`     Details: Name=${vol.matchDetails.nameMatch}, Publisher=${vol.matchDetails.publisherMatch}, YearDiff=${vol.matchDetails.yearDiff}`);
        });

        // Select best volume (minimum score threshold of 30)
        const bestVolume = scoredVolumes.find((vol: any) => vol.score >= 30);
        
        if (!bestVolume) {
            console.log(`[COMIC-VINE-SCRAPER] No suitable volume found for "${parsed.series}" (highest score: ${scoredVolumes[0]?.score || 0})`);
            return { success: false, error: `No suitable volume found for "${parsed.series}"` };
        }

        console.log(`[COMIC-VINE-SCRAPER] Best volume selected: "${bestVolume.name}" (${bestVolume.start_year}) - Score: ${bestVolume.score}`);

        // Step 2: Fetch the specific issue from that volume
        const issueSearchUrl = `${API_BASE_URL}/issues/?api_key=${apiKey}&format=json&filter=volume:${bestVolume.id},issue_number:${parsed.issue}&field_list=name,cover_date,description,person_credits,volume,image,api_detail_url,site_detail_url,characters,genres,price,barcode,language_credits,concept_credits,location_credits,story_arc_credits,team_credits`;
        console.log(`[COMIC-VINE-SCRAPER] Issue search URL: ${issueSearchUrl}`);
        
        const issueResponse = await electronAPI.fetchComicVine(issueSearchUrl);
        
        if (!issueResponse.success) {
            throw new Error(issueResponse.error || `Issue API request failed`);
        }
        const issueData = issueResponse.data;
        console.log(`[COMIC-VINE-SCRAPER] Issue search raw response:`, issueData);

        if (issueData.status_code !== 1 || issueData.number_of_total_results === 0) {
            console.warn(`[COMIC-VINE-SCRAPER] No issue match found for "${parsed.series}" #${parsed.issue} in volume "${bestVolume.name}"`);
            return { success: false, error: `No match found for "${parsed.series}" #${parsed.issue} in volume "${bestVolume.name}"` };
        }

        const issue = issueData.results[0];
        console.log(`[COMIC-VINE-SCRAPER] Issue details found:`, issue);

        // Determine confidence based on how much data we found
        let confidence: Confidence = 'Low';
        if (issue.description && issue.person_credits?.length > 0) {
            confidence = 'High';
        } else if (issue.description || issue.person_credits?.length > 0) {
            confidence = 'Medium';
        }

        return {
            success: true,
            confidence: confidence,
            data: {
                series: bestVolume.name,
                issue: parsed.issue,
                year: parsed.year || (issue.cover_date ? new Date(issue.cover_date).getFullYear() : new Date().getFullYear()),
                publisher: bestVolume.publisher.name,
                volume: bestVolume.name, // Using the volume name as the volume identifier
                summary: stripHtml(issue.description),
                creators: issue.person_credits?.map((p: any) => ({ name: p.name, role: p.role })) || [],
                title: issue.name,
                publicationDate: issue.cover_date,
                genre: issue.genres?.map((g: any) => g.name).join(', ') || undefined,
                characters: issue.characters?.map((c: any) => c.name).join(', ') || undefined,
                price: issue.price || undefined,
                barcode: issue.barcode || undefined,
                languageCode: issue.language_credits?.map((l: any) => l.name).join(', ') || undefined, // Assuming language_credits might contain language info
                countryCode: undefined, // Comic Vine API doesn't directly provide country code for issues
                confidence: confidence,
                source: 'api'
            }
        };

    } catch (error) {
        console.error("[COMIC-VINE-SCRAPER] Comic Vine API Error:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return { success: false, error: `API Error: ${errorMessage}` };
    }
};

/**
 * Test API Connection (Comic Vine)
 * Tests the connection to the Comic Vine API via the Electron main process.
 * 
 * @param apiKey - API key to test
 * @returns Object with success status and message
 */
export const testApiConnection = async (apiKey: string): Promise<{ success: boolean; message: string }> => {
    const electronAPI = window.electronAPI;
    if (!electronAPI) {
        return { success: false, message: "This feature is only available in the desktop application." };
    }

    if (!apiKey) {
        return { success: false, message: "API Key is missing." };
    }

    try {
        const testUrl = `${API_BASE_URL}/search/?api_key=${apiKey}&format=json&query=test&limit=1`;
        console.log(`[COMIC-VINE-SCRAPER] Testing connection URL: ${testUrl}`);
        
        const response = await electronAPI.fetchComicVine(testUrl);
        console.log(`[COMIC-VINE-SCRAPER] Test connection raw response:`, response);

        if (!response.success) {
            // This handles network errors or non-2xx HTTP statuses from the IPC handler
            throw new Error(response.error || "Failed to connect to the API.");
        }

        const data = response.data;
        if (data.status_code === 1) {
            return { success: true, message: "Connection successful!" };
        } else if (data.status_code === 100) {
            return { success: false, message: "Invalid API Key provided." };
        } else {
            return { success: false, message: `API returned an error: ${data.error}` };
        }
    } catch (error) {
        console.error("[COMIC-VINE-SCRAPER] Test connection failed:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return { success: false, message: `Failed to connect to the API. ${errorMessage}` };
    }
};