import { useElectron } from '@/hooks/useElectron';
import { Comic, NewComic } from '@/types';

export interface DatabaseComic extends Comic {
  filePath: string;
  fileSize: number;
  dateAdded: string;
  lastModified: string;
}

export class ElectronDatabaseService {
  private electronAPI: any;
  private initialized = false;

  constructor(electronAPI: any) {
    this.electronAPI = electronAPI;
  }

  // Initialize the database
  async initialize(): Promise<void> {
    if (!this.electronAPI || this.initialized) {
      return;
    }

    try {
      await this.electronAPI.initDatabase();
      this.initialized = true;
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  // Save a comic to the database
  async saveComic(comic: NewComic & { filePath: string; fileSize: number }): Promise<DatabaseComic> {
    if (!this.electronAPI) {
      throw new Error('Electron API not available');
    }

    await this.initialize();

    try {
      const savedComic = await this.electronAPI.saveComic({
        ...comic,
        dateAdded: new Date().toISOString(),
        lastModified: new Date().toISOString()
      });
      return savedComic;
    } catch (error) {
      console.error('Error saving comic:', error);
      throw error;
    }
  }

  // Get all comics from the database
  async getComics(): Promise<DatabaseComic[]> {
    if (!this.electronAPI) {
      return [];
    }

    await this.initialize();

    try {
      const comics = await this.electronAPI.getComics();
      return comics;
    } catch (error) {
      console.error('Error getting comics:', error);
      return [];
    }
  }

  // Update a comic in the database
  async updateComic(comic: DatabaseComic): Promise<DatabaseComic> {
    if (!this.electronAPI) {
      throw new Error('Electron API not available');
    }

    await this.initialize();

    try {
      const updatedComic = await this.electronAPI.updateComic({
        ...comic,
        lastModified: new Date().toISOString()
      });
      return updatedComic;
    } catch (error) {
      console.error('Error updating comic:', error);
      throw error;
    }
  }

  // Delete a comic from the database
  async deleteComic(comicId: string): Promise<boolean> {
    if (!this.electronAPI) {
      return false;
    }

    await this.initialize();

    try {
      const success = await this.electronAPI.deleteComic(comicId);
      return success;
    } catch (error) {
      console.error('Error deleting comic:', error);
      return false;
    }
  }

  // Search comics
  async searchComics(query: string): Promise<DatabaseComic[]> {
    const allComics = await this.getComics();
    const lowercaseQuery = query.toLowerCase();
    
    return allComics.filter(comic => 
      comic.series.toLowerCase().includes(lowercaseQuery) ||
      comic.publisher.toLowerCase().includes(lowercaseQuery) ||
      comic.issue.toLowerCase().includes(lowercaseQuery)
    );
  }

  // Get comics by series
  async getComicsBySeries(series: string): Promise<DatabaseComic[]> {
    const allComics = await this.getComics();
    return allComics.filter(comic => 
      comic.series.toLowerCase() === series.toLowerCase()
    );
  }

  // Get comics by publisher
  async getComicsByPublisher(publisher: string): Promise<DatabaseComic[]> {
    const allComics = await this.getComics();
    return allComics.filter(comic => 
      comic.publisher.toLowerCase() === publisher.toLowerCase()
    );
  }

  // Check if database is available
  isAvailable(): boolean {
    return !!this.electronAPI;
  }
}

// Hook to get the database service
export const useElectronDatabaseService = () => {
  const { electronAPI } = useElectron();
  
  if (!electronAPI) {
    return null;
  }

  return new ElectronDatabaseService(electronAPI);
};