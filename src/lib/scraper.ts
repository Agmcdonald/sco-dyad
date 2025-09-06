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
        // Step 1: Search for the volume
        const volumeSearchUrl = `${API_BASE_URL}/search/?api_key=${apiKey}&format=json&query=${encodeURIComponent(parsed.series)}&resources=volume&field_list=name,start_year,publisher,id`;
        console.log(`[COMIC-VINE-SCRAPER] Volume search URL: ${volumeSearchUrl}`);
        
        const volumeResponse = await electronAPI.fetchComicVine(volumeSearchUrl);
        
        if (!volumeResponse.success) {
            throw new Error(volumeResponse.error || `Volume API request failed`);
        }
        const volumeData = volumeResponse.data;
        console.log(`[COMIC-VINE-SCRAPER] Volume search raw response:`, volumeData);

        if (volumeData.status_code !== 1 || volumeData.number_of_total_results === 0) {
            console.warn(`[COMIC-VINE-SCRAPER] No volume found for "${parsed.series}"`);
            return { success: false, error: `No volume found for "${parsed.series}"` };
        }

        // Find the best volume match (closest start_year to parsed year)
        let bestVolume = volumeData.results[0];
        if (parsed.year && volumeData.results.length > 1) {
            bestVolume = volumeData.results.reduce((prev: any, curr: any) => 
                Math.abs(Number(curr.start_year) - parsed.year!) < Math.abs(Number(prev.start_year) - parsed.year!) ? curr : prev
            );
        }
        console.log(`[COMIC-VINE-SCRAPER] Best volume found:`, bestVolume);

        // Step 2: Fetch the specific issue from that volume
        const issueSearchUrl = `${API_BASE_URL}/issues/?api_key=${apiKey}&format=json&filter=volume:${bestVolume.id},issue_number:${parsed.issue}&field_list=name,cover_date,description,person_credits,volume`;
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

        return {
            success: true,
            data: {
                series: bestVolume.name,
                publisher: bestVolume.publisher.name,
                volume: bestVolume.name, // Using the volume name as the volume identifier
                summary: stripHtml(issue.description),
                creators: issue.person_credits.map((p: any) => ({ name: p.name, role: p.role })),
                title: issue.name,
                publicationDate: issue.cover_date,
                confidence: 'High',
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