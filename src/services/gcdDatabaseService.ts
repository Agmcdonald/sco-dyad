import { useElectron } from '@/hooks/useElectron';
import { AppSettings, Creator } from '@/types';

export interface GcdSeriesSearchResult {
  id: number;
  name: string;
  publisher: string;
  year_began: number;
}

export interface GcdIssueDetails {
  id: number;
  title: string;
  publication_date: string;
  synopsis: string;
  genre: string;
  characters: string;
}

export class GcdDatabaseService {
  private electronAPI: any;
  private isConnected = false;

  constructor(electronAPI: any) {
    this.electronAPI = electronAPI;
  }

  async connect(dbPath: string): Promise<boolean> {
    if (!this.electronAPI) return false;
    try {
      const success = await this.electronAPI.gcdDbConnect(dbPath);
      this.isConnected = success;
      return success;
    } catch (error) {
      console.error("Failed to connect to GCD database:", error);
      this.isConnected = false;
      return false;
    }
  }

  async searchSeries(seriesName: string): Promise<GcdSeriesSearchResult[]> {
    if (!this.isConnected || !this.electronAPI) {
      return [];
    }
    try {
      const results = await this.electronAPI.gcdDbSearchSeries(seriesName);
      return results;
    } catch (error) {
      console.error(`Error searching for series "${seriesName}":`, error);
      return [];
    }
  }

  async getIssueDetails(seriesId: number, issueNumber: string): Promise<GcdIssueDetails | null> {
    if (!this.isConnected || !this.electronAPI) {
      return null;
    }
    try {
      const result = await this.electronAPI.gcdDbGetIssueDetails(seriesId, issueNumber);
      return result;
    } catch (error) {
      console.error(`Error getting details for issue "${issueNumber}" in series "${seriesId}":`, error);
      return null;
    }
  }

  async getIssueCreators(issueId: number): Promise<Creator[]> {
    if (!this.isConnected || !this.electronAPI) {
      return [];
    }
    try {
      const results = await this.electronAPI.gcdDbGetIssueCreators(issueId);
      return results;
    } catch (error) {
      console.error(`Error getting creators for issue ID "${issueId}":`, error);
      return [];
    }
  }

  async searchPublishers(query: string): Promise<string[]> {
    if (!this.isConnected || !this.electronAPI) {
      return [];
    }
    try {
      const results = await this.electronAPI.gcdDbSearchPublishers(query);
      return results;
    } catch (error) {
      console.error(`Error searching for publishers with query "${query}":`, error);
      return [];
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected && this.electronAPI) {
      await this.electronAPI.gcdDbDisconnect();
      this.isConnected = false;
    }
  }

  isAvailable(): boolean {
    return !!this.electronAPI;
  }
}

// Hook to get the database service
export const useGcdDatabaseService = () => {
  const { electronAPI } = useElectron();
  
  if (!electronAPI) {
    return null;
  }

  return new GcdDatabaseService(electronAPI);
};