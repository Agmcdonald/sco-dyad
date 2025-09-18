import { useElectron } from '@/hooks/useElectron';

/**
 * @interface ComicFileInfo
 * @summary Defines the structure for basic information about a comic file.
 */
export interface ComicFileInfo {
  path: string;
  name: string;
  size: number;
  type: 'cbr' | 'cbz' | 'pdf' | 'folder';
  coverImage?: string;
}

/**
 * @interface ComicMetadata
 * @summary Defines the structure for metadata extracted from a comic file.
 */
export interface ComicMetadata {
  series?: string;
  issue?: string;
  year?: number;
  publisher?: string;
  volume?: string;
  summary?: string;
  pageCount?: number;
}

/**
 * @class ElectronFileService
 * @summary A class that provides methods for interacting with the file system via Electron's main process.
 * @description This service abstracts the underlying IPC calls for file operations like
 * scanning folders, getting file info, and extracting covers.
 */
export class ElectronFileService {
  private electronAPI: any;

  /**
   * @constructor
   * @param {any} electronAPI - The Electron API object exposed from the preload script.
   */
  constructor(electronAPI: any) {
    this.electronAPI = electronAPI;
  }

  /**
   * Scans a folder for comic files.
   * @param {string} folderPath - The absolute path of the folder to scan.
   * @returns {Promise<ComicFileInfo[]>} A promise that resolves to an array of comic file information objects.
   */
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

  /**
   * Gets information about a single comic file.
   * @param {string} filePath - The absolute path of the file.
   * @returns {Promise<ComicFileInfo | null>} A promise that resolves to the file's information or null on error.
   */
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

  /**
   * Extracts a cover image from a comic file.
   * @param {string} filePath - The absolute path of the comic file.
   * @returns {Promise<string | null>} A promise that resolves to the path of the extracted cover, or null on error.
   */
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

  /**
   * Organizes a file by moving it to the library directory.
   * @param {string} sourcePath - The current path of the file.
   * @param {string} targetPath - The destination path for the file.
   * @returns {Promise<boolean>} A promise that resolves to `true` on success, `false` otherwise.
   */
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

  /**
   * Checks if the Electron API is available.
   * @returns {boolean} `true` if running in Electron, `false` otherwise.
   */
  isElectronAvailable(): boolean {
    return !!this.electronAPI;
  }
}

/**
 * @hook useElectronFileService
 * @summary A custom hook that provides an instance of the `ElectronFileService`.
 * @description This hook simplifies access to the file service, returning a new instance
 * of `ElectronFileService` if the Electron API is available, or `null` otherwise.
 * @returns {ElectronFileService | null} An instance of the file service, or `null`.
 */
export const useElectronFileService = () => {
  const { electronAPI } = useElectron();
  
  if (!electronAPI) {
    return null;
  }

  return new ElectronFileService(electronAPI);
};