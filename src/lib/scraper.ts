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
 * Fetches data from the Comic Vine API.
 * 
 * @param parsed - Parsed comic information from filename
 * @param apiKey - API key for Comic Vine
 * @returns ScraperResult with comic data
 */
export const fetchComicMetadata = async (
    parsed: ParsedComicInfo,
    apiKey: string
): Promise<ScraperResult> => {
    if (!apiKey) {
        return { success: false, error: "Comic Vine API Key is missing. Please set it in Settings." };
    }
    if (!parsed.series || !parsed.issue) {
        return { success: false, error: "Series or issue number is missing for API lookup." };
    }

    try {
        // Step 1: Search for the volume
        const volumeSearchUrl = `${API_BASE_URL}/search/?api_key=${apiKey}&format=json&query=${encodeURIComponent(parsed.series)}&resources=volume&field_list=name,start_year,publisher,id`;
        const volumeResponse = await fetch(volumeSearchUrl);
        if (!volumeResponse.ok) throw new Error(`API request failed with status ${volumeResponse.status}`);
        const volumeData = await volumeResponse.json();

        if (volumeData.status_code !== 1 || volumeData.number_of_total_results === 0) {
            return { success: false, error: `No volume found for "${parsed.series}"` };
        }

        // Find the best volume match (closest start_year to parsed year)
        let bestVolume = volumeData.results[0];
        if (parsed.year && volumeData.results.length > 1) {
            bestVolume = volumeData.results.reduce((prev: any, curr: any) => 
                Math.abs(Number(curr.start_year) - parsed.year!) < Math.abs(Number(prev.start_year) - parsed.year!) ? curr : prev
            );
        }

        // Step 2: Fetch the specific issue from that volume
        const issueSearchUrl = `${API_BASE_URL}/issues/?api_key=${apiKey}&format=json&filter=volume:${bestVolume.id},issue_number:${parsed.issue}&field_list=name,cover_date,description,person_credits,volume`;
        const issueResponse = await fetch(issueSearchUrl);
        if (!issueResponse.ok) throw new Error(`API request failed with status ${issueResponse.status}`);
        const issueData = await issueResponse.json();

        if (issueData.status_code !== 1 || issueData.number_of_total_results === 0) {
            return { success: false, error: `No match found for "${parsed.series}" #${parsed.issue} in volume "${bestVolume.name}"` };
        }

        const issue = issueData.results[0];

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
        console.error("Comic Vine API Error:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return { success: false, error: `API Error: ${errorMessage}` };
    }
};

/**
 * Test API Connection (Comic Vine)
 * Simulates testing the connection to the Comic Vine API
 * 
 * @param apiKey - API key to test
 * @returns Object with success status and message
 */
export const testApiConnection = async (apiKey: string): Promise<{ success: boolean; message: string }> => {
    if (!apiKey) {
        return { success: false, message: "API Key is missing." };
    }

    try {
        const testUrl = `${API_BASE_URL}/search/?api_key=${apiKey}&format=json&query=test&limit=1`;
        const response = await fetch(testUrl);
        const data = await response.json();

        if (data.status_code === 1) {
            return { success: true, message: "Connection successful!" };
        } else if (data.status_code === 100) {
            return { success: false, message: "Invalid API Key provided." };
        } else {
            return { success: false, message: `API returned an error: ${data.error}` };
        }
    } catch (error) {
        return { success: false, message: "Failed to connect to the API. Check your network connection." };
    }
};


// --- Mock Marvel API Functions (Unchanged) ---

/**
 * Mock Marvel API Data
 */
const mockMarvelApiData: Record<string, any> = {
    "The Amazing Spider-Man": {
        publisher: "Marvel Comics",
        volume: "1963",
        summary: "The classic adventures of Spider-Man from the early days.",
        creators: [
            { name: "Stan Lee", role: "Writer" },
            { name: "Steve Ditko", role: "Artist" },
            { name: "John Romita Sr.", role: "Cover Artist" }
        ],
        issueData: {
            "300": { title: "Venom", publicationDate: "1988-05-01" }
        }
    },
    "Invincible Iron Man": {
        publisher: "Marvel Comics",
        volume: "2008",
        summary: "Tony Stark is Iron Man. His greatest invention becomes his greatest mistake.",
        creators: [
            { name: "Matt Fraction", role: "Writer" },
            { name: "Salvador Larroca", role: "Artist" }
        ],
        issueData: {
            "1": { title: "The Five Nightmares, Part 1", publicationDate: "2008-07-01" }
        }
    }
};

/**
 * Fetch Marvel Metadata (Mock)
 */
export const fetchMarvelMetadata = async (
    parsed: ParsedComicInfo,
    publicKey: string,
    privateKey: string
): Promise<ScraperResult> => {
    await new Promise(res => setTimeout(res, 500)); // Simulate network delay

    if (!publicKey || !privateKey) {
        return { success: false, error: "Marvel API keys are missing." };
    }
    if (!parsed.series || !parsed.issue) {
        return { success: false, error: "Series or issue number is missing for Marvel API lookup." };
    }

    const seriesMatch = mockMarvelApiData[parsed.series];
    if (seriesMatch) {
        const issueMatch = seriesMatch.issueData?.[parsed.issue];
        return {
            success: true,
            data: {
                publisher: seriesMatch.publisher,
                volume: parsed.volume || seriesMatch.volume,
                summary: seriesMatch.summary,
                creators: seriesMatch.creators,
                title: issueMatch?.title,
                publicationDate: issueMatch?.publicationDate,
                confidence: 'High',
                source: 'api'
            }
        };
    }
    return { success: false, error: `No match found for "${parsed.series}" in Marvel API.` };
};

/**
 * Test Marvel API Connection (Mock)
 */
export const testMarvelApiConnection = async (publicKey: string, privateKey: string): Promise<{ success: boolean; message: string }> => {
    await new Promise(res => setTimeout(res, 750)); // Simulate network delay
    
    if (!publicKey || !privateKey) {
        return { success: false, message: "Public or Private Key is missing." };
    }
    if (publicKey.length < 10 || privateKey.length < 10) {
        return { success: false, message: "Invalid API Keys provided." };
    }
    return { success: true, message: "Marvel API connection successful!" };
};