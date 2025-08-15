import { ParsedComicInfo } from "./parser";
import { searchKnowledgeBase, KnowledgeMatch } from "./knowledgeBase";
import { Creator } from "@/types";

interface ScraperResult {
    success: boolean;
    data?: {
        publisher: string;
        volume: string;
        summary: string;
        creators: Creator[];
        confidence: 'High' | 'Medium' | 'Low';
        source: 'knowledge' | 'api';
    };
    error?: string;
}

// This is our mock database. A real scraper would query an API.
const mockApiData: Record<string, any> = {
    "Saga": { 
        publisher: "Image Comics", 
        volume: "1",
        summary: "Saga is an epic space opera/fantasy comic book series written by Brian K. Vaughan and illustrated by Fiona Staples, published monthly by Image Comics.",
        creators: [
            { name: "Brian K. Vaughan", role: "Writer" },
            { name: "Fiona Staples", role: "Artist" }
        ]
    },
    "Batman The Knight": { 
        publisher: "DC Comics", 
        volume: "2022",
        summary: "The origin of Batman and his never-ending crusade against crime in Gotham City is modern mythology, but what about the story in between? How did an angry, damaged young man grow into the most accomplished detective and crime-fighter the world has ever known?",
        creators: [
            { name: "Chip Zdarsky", role: "Writer" },
            { name: "Carmine Di Giandomenico", role: "Artist" }
        ]
    },
    "The Amazing Spider-Man": { publisher: "Marvel Comics", volume: "1963", summary: "The classic adventures of Spider-Man from the early days.", creators: [{name: "Stan Lee", role: "Writer"}, {name: "Steve Ditko", role: "Artist"}] },
    "Action Comics": { publisher: "DC Comics", volume: "1938", summary: "The comic that introduced Superman to the world.", creators: [{name: "Jerry Siegel", role: "Writer"}, {name: "Joe Shuster", role: "Artist"}] },
    "Radiant Black": { publisher: "Image Comics", volume: "2021", summary: "A new superhero for a new generation.", creators: [{name: "Kyle Higgins", role: "Writer"}] },
    "Invincible": { publisher: "Image Comics", volume: "2003", summary: "The story of a teenage superhero trying to live up to his father's legacy.", creators: [{name: "Robert Kirkman", role: "Writer"}, {name: "Cory Walker", role: "Artist"}] },
    "Monstress": { publisher: "Image Comics", volume: "2015", summary: "A young woman struggles to survive in a world torn apart by war.", creators: [{name: "Marjorie Liu", role: "Writer"}, {name: "Sana Takeda", role: "Artist"}] },
    "Paper Girls": { publisher: "Image Comics", volume: "2015", summary: "Four young girls who deliver newspapers in 1988 get caught up in a conflict between warring factions of time-travelers.", creators: [{name: "Brian K. Vaughan", role: "Writer"}, {name: "Cliff Chiang", role: "Artist"}] },
    "The Wicked The Divine": { publisher: "Image Comics", volume: "2014", summary: "Every ninety years, twelve gods incarnate as humans. They are loved. They are hated. In two years, they are all dead.", creators: [{name: "Kieron Gillen", role: "Writer"}, {name: "Jamie McKelvie", role: "Artist"}] },
    "East of West": { publisher: "Image Comics", volume: "2013", summary: "The Four Horsemen of the Apocalypse roam an alternate timeline American West.", creators: [{name: "Jonathan Hickman", role: "Writer"}, {name: "Nick Dragotta", role: "Artist"}] },
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
                    creators: [],
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
                    creators: [],
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
                summary: match.summary || `Successfully scraped metadata for ${parsed.series} #${parsed.issue} from Comic Vine API.`,
                creators: match.creators || [],
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