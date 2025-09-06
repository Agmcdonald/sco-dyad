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

        // Filter and find the best volume match
        let candidateVolumes = volumeData.results;

        // Prioritize exact series name match (case-insensitive, ignoring non-alphanumeric for comparison)
        const normalizedParsedSeries = parsed.series.toLowerCase().replace(/[^a-z0-9]/g, '');
        candidateVolumes.sort((a: any, b: any) => {
            const normalizedA = a.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            const normalizedB = b.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (normalizedA === normalizedParsedSeries && normalizedB !== normalizedParsedSeries) return -1;
            if (normalizedA !== normalizedParsedSeries && normalizedB === normalizedParsedSeries) return 1;
            return 0;
        });

        // Further filter by publisher if available in parsed data
        if (parsed.publisher) {
            const normalizedParsedPublisher = parsed.publisher.toLowerCase();
            candidateVolumes = candidateVolumes.filter((volume: any) => 
                volume.publisher?.name?.toLowerCase().includes(normalizedParsedPublisher)
            );
        }

        // Select the best volume: prioritize exact name match, then closest year
        let bestVolume = candidateVolumes[0];
        if (candidateVolumes.length > 1 && parsed.year) {
            bestVolume = candidateVolumes.reduce((prev: any, curr: any) => {
                const prevYearDiff = Math.abs(Number(prev.start_year) - parsed.year!);
                const currYearDiff = Math.abs(Number(curr.start_year) - parsed.year!);
                
                // If one is an exact series name match and the other isn't, prefer the exact match
                const prevNormalizedName = prev.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                const currNormalizedName = curr.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (prevNormalizedName === normalizedParsedSeries && currNormalizedName !== normalizedParsedSeries) return prev;
                if (prevNormalizedName !== normalizedParsedSeries && currNormalizedName === normalizedParsedSeries) return curr;

                // Otherwise, prefer the one with the closest year
                return currYearDiff < prevYearDiff ? curr : prev;
            });
        }
        
        if (!bestVolume) {
            console.warn(`[COMIC-VINE-SCRAPER] No suitable volume found after filtering for "${parsed.series}"`);
            return { success: false, error: `No suitable volume found for "${parsed.series}"` };
        }
        console.log(`[COMIC-VINE-SCRAPER] Best volume selected:`, bestVolume);

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