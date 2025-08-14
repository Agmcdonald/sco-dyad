import { ParsedComicInfo } from "./parser";
import { searchKnowledgeBase, KnowledgeMatch } from "./knowledgeBase";

interface ScraperResult {
    success: boolean;
    data?: {
        publisher: string;
        volume: string;
        summary: string;
        confidence: 'High' | 'Medium' | 'Low';
        source: 'knowledge' | 'api';
    };
    error?: string;
}

// This is our mock database. A real scraper would query an API.
const mockApiData: Record<string, any> = {
    "Saga": { publisher: "Image Comics", volume: "1" },
    "Batman The Knight": { publisher: "DC Comics", volume: "2022" },
    "The Amazing Spider-Man": { publisher: "Marvel Comics", volume: "1963" },
    "Action Comics": { publisher: "DC Comics", volume: "1938" },
    "Radiant Black": { publisher: "Image Comics", volume: "2021" },
    "Invincible": { publisher: "Image Comics", volume: "2003" },
    "Monstress": { publisher: "Image Comics", volume: "2015" },
    "Paper Girls": { publisher: "Image Comics", volume: "2015" },
    "The Wicked The Divine": { publisher: "Image Comics", volume: "2014" },
    "East of West": { publisher: "Image Comics", volume: "2013" },
};

export const fetchComicMetadata = async (
    parsed: ParsedComicInfo,
    apiKey: string
): Promise<ScraperResult> => {
    // First, try the knowledge base
    const knowledgeMatches = searchKnowledgeBase(parsed);
    
    if (knowledgeMatches.length > 0) {
        const bestMatch = knowledgeMatches[0];
        
        // If we have a high confidence match, use it
        if (bestMatch.confidence === 'High') {
            return {
                success: true,
                data: {
                    publisher: bestMatch.publisher,
                    volume: bestMatch.volume,
                    summary: `Matched from knowledge base: ${bestMatch.series} (${bestMatch.publisher})`,
                    confidence: bestMatch.confidence,
                    source: 'knowledge'
                }
            };
        }
        
        // For medium confidence, we could still use it but mark it differently
        if (bestMatch.confidence === 'Medium') {
            return {
                success: true,
                data: {
                    publisher: bestMatch.publisher,
                    volume: bestMatch.volume,
                    summary: `Probable match from knowledge base: ${bestMatch.series} (${bestMatch.publisher})`,
                    confidence: bestMatch.confidence,
                    source: 'knowledge'
                }
            };
        }
    }
    
    // If no good knowledge base match, fall back to API
    // Simulate network delay
    await new Promise(res => setTimeout(res, 500));

    if (!apiKey || apiKey.length < 10) {
        return { success: false, error: "API Key is missing or invalid. Please set it in Settings." };
    }

    if (!parsed.series) {
        return { success: false, error: "Could not identify a series name from the filename." };
    }

    const match = mockApiData[parsed.series];

    if (match) {
        return {
            success: true,
            data: {
                publisher: match.publisher,
                volume: parsed.volume || match.volume,
                summary: `Successfully scraped metadata for ${parsed.series} #${parsed.issue} from Comic Vine API.`,
                confidence: 'High',
                source: 'api'
            }
        };
    }

    return { success: false, error: `No match found for "${parsed.series}" in knowledge base or remote database.` };
};

export const testApiConnection = async (apiKey: string): Promise<{ success: boolean; message: string }> => {
    // Simulate network delay
    await new Promise(res => setTimeout(res, 750));

    if (!apiKey) {
        return { success: false, message: "API Key is missing." };
    }

    // In a real app, you'd make a lightweight API call here to validate the key.
    // For our mock, we'll just check for a reasonable length.
    if (apiKey.length < 10) {
        return { success: false, message: "Invalid API Key provided." };
    }

    return { success: true, message: "Connection successful!" };
};