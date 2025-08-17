import { useElectron } from '@/hooks/useElectron';
import { AppSettings } from '@/types';

// This is a placeholder for the actual structure we'd get from the DB
export interface GcdSeriesSearchResult {
  id: number;
  name: string;
  publisher: string;
  year_began: number;
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
      // console.warn("GCD database not connected. Cannot perform search.");
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