import { useElectron } from '@/hooks/useElectron';

export interface ComicFileInfo {
  path: string;
  name: string;
  size: number;
  type: 'cbr' | 'cbz' | 'pdf' | 'folder';
  coverImage?: string;
}

export interface ComicMetadata {
  series?: string;
  issue?: string;
  year?: number;
  publisher?: string;
  volume?: string;
  summary?: string;
  pageCount?: number;
}

export class ElectronFileService {
  private electronAPI: any;

  constructor(electronAPI: any) {
    this.electronAPI = electronAPI;
  }

  // Scan a folder for comic files
  async scanFolder(folderPath: string): Promise<ComicFileInfo[]> {
    if (!this.electronAPI) {
      throw new Error('Electron API not available');
    }

    try {
      const filePaths = await this.electronAPI.scanFolder(folderPath);
      const fileInfos: ComicFileInfo[] = [];

      for (const filePath of filePaths) {
        const fileInfo = await this.getFileInfo(filePath);
        if (fileInfo) {
          fileInfos.push(fileInfo);
        }
      }

      return fileInfos;
    } catch (error) {
      console.error('Error scanning folder:', error);
      throw error;
    }
  }

  // Get information about a comic file
  async getFileInfo(filePath: string): Promise<ComicFileInfo | null> {
    if (!this.electronAPI) {
      return null;
    }

    try {
      const fileData = await this.electronAPI.readComicFile(filePath);
      return fileData;
    } catch (error) {
      console.error('Error reading file info:', error);
      return null;
    }
  }

  // Extract cover image from comic file
  async extractCover(filePath: string): Promise<string | null> {
    if (!this.electronAPI) {
      return null;
    }

    try {
      const coverPath = await this.electronAPI.extractCover(filePath);
      return coverPath;
    } catch (error) {
      console.error('Error extracting cover:', error);
      return null;
    }
  }

  // Organize a file to the library
  async organizeFile(sourcePath: string, targetPath: string): Promise<boolean> {
    if (!this.electronAPI) {
      return false;
    }

    try {
      const success = await this.electronAPI.organizeFile(sourcePath, targetPath);
      return success;
    } catch (error) {
      console.error('Error organizing file:', error);
      return false;
    }
  }

  // Check if running in Electron
  isElectronAvailable(): boolean {
    return !!this.electronAPI;
  }
}

// Hook to get the file service
export const useElectronFileService = () => {
  const { electronAPI } = useElectron();
  
  if (!electronAPI) {
    return null;
  }

  return new ElectronFileService(electronAPI);
};