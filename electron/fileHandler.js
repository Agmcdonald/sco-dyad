/**
 * Comic File Handler
 * 
 * This module is responsible for all file system operations related to comic files.
 * It runs in the Electron main process and provides functionalities like:
 * - Scanning folders for comic files (CBR, CBZ)
 * - Reading file metadata (size, type, etc.)
 * - Extracting cover images from comic archives
 * - Getting a list of pages from an archive
 * - Extracting individual pages as data URLs for the reader
 * - Organizing (moving/copying) files to the library
 * 
 * It uses libraries like `node-stream-zip` for ZIP archives and `unrar-promise`
 * for robust error handling and timeouts.
 */

const fs = require('fs').promises;
const path = require('path');
const StreamZip = require('node-stream-zip');
const sharp = require('sharp');
const os = require('os');

class ComicFileHandler {
  constructor() {
    this.supportedExtensions = ['.cbr', '.cbz'];
    this.imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    this.unrarAvailable = false;
    this.unrar = null;
    this.initUnrar();
  }

  /**
   * Initialize unrar-promise for CBR support
   * Handles dynamic import and gracefully degrades if unrar is not available
   */
  async initUnrar() {
    try {
      const unrarModule = await import('unrar-promise');
      this.unrar = unrarModule.unrar;
      this.unrarAvailable = true;
      console.log('RAR support initialized successfully');
    } catch (error) {
      console.warn('RAR support not available:', error.message);
      this.unrarAvailable = false;
      this.unrar = null;
    }
  }

  /**
   * Recursively walk a directory to find all files
   * @param dir - Directory to walk
   * @returns Array of full file paths
   */
  async _walk(dir) {
    try {
      let files = await fs.readdir(dir);
      files = await Promise.all(files.map(async file => {
          const filePath = path.join(dir, file);
          try {
            const stats = await fs.stat(filePath);
            if (stats.isDirectory()) return this._walk(filePath);
            else if(stats.isFile()) return filePath;
          } catch (error) {
            console.warn(`Could not stat file ${filePath}:`, error.message);
            return [];
          }
      }));
      return files.reduce((all, folderContents) => all.concat(folderContents), []).filter(Boolean);
    } catch (error) {
      console.error(`Error walking directory ${dir}:`, error);
      return [];
    }
  }

  // Helper to check if a file is a supported comic format
  isComicFile(filePath) {
    return this.supportedExtensions.includes(path.extname(filePath).toLowerCase());
  }

  // Helper to check if a file is an image
  isImageFile(filePath) {
    return this.imageExtensions.includes(path.extname(filePath).toLowerCase());
  }

  /**
   * Scan a folder for comic files
   * @param folderPath - Path to the folder to scan
   * @returns Array of comic file information objects
   */
  async scanFolder(folderPath) {
    try {
      const files = [];
      const entries = await fs.readdir(folderPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(folderPath, entry.name);
        
        if (entry.isFile() && this.isComicFile(fullPath)) {
          const stats = await fs.stat(fullPath);
          files.push({
            path: fullPath,
            name: entry.name,
            size: stats.size,
            type: this.getFileType(fullPath),
            lastModified: stats.mtime
          });
        } else if (entry.isDirectory()) {
          const subFiles = await this.scanFolder(fullPath);
          files.push(...subFiles);
        }
      }
      return files;
    } catch (error) {
      console.error('Error scanning folder:', error);
      throw error;
    }
  }

  // Get file type from extension
  getFileType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.cbr': return 'cbr';
      case '.cbz': return 'cbz';
      case '.pdf': return 'pdf';
      default: return 'unknown';
    }
  }

  /**
   * Read comic file information (metadata)
   * @param filePath - Path to the comic file
   * @returns File information object, including page count
   */
  async readComicFile(filePath) {
    try {
      const stats = await fs.stat(filePath);
      const fileInfo = {
        path: filePath,
        name: path.basename(filePath),
        size: stats.size,
        type: this.getFileType(filePath),
        lastModified: stats.mtime
      };

      if (fileInfo.type === 'cbz' || fileInfo.type === 'cbr') {
        try {
          fileInfo.pageCount = await this.getPageCount(filePath);
        } catch (error) {
          console.warn('Could not get page count for', filePath, error.message);
        }
      }
      return fileInfo;
    } catch (error) {
      console.error('Error reading comic file:', error);
      throw error;
    }
  }

  /**
   * Get page count from a comic archive
   * @param filePath - Path to the comic file
   * @returns Number of image pages in the archive
   */
  async getPageCount(filePath) {
    const fileType = this.getFileType(filePath);
    
    if (fileType === 'cbz') {
      let zip;
      try {
        zip = new StreamZip.async({ file: filePath });
        const entries = await zip.entries();
        return Object.values(entries).filter(e => !e.isDirectory && this.isImageFile(e.name)).length;
      } finally {
        if (zip) await zip.close().catch(() => {});
      }
    } else if (fileType === 'cbr') {
      if (!this.unrarAvailable) return 0;
      let tempDir = null;
      try {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'comic-pages-'));
        await Promise.race([
          this.unrar(filePath, tempDir),
          new Promise((_, reject) => setTimeout(() => reject(new Error('CBR page count timeout')), 15000))
        ]);
        const allFiles = await this._walk(tempDir);
        return allFiles.filter(file => this.isImageFile(file)).length;
      } finally {
        if (tempDir) await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      }
    }
    return 0;
  }

  /**
   * Extract cover image from a comic file to a specified directory
   * @param filePath - Path to the comic file
   * @param outputDir - Directory to save the cover image
   * @returns Path to the extracted cover image
   */
  async extractCover(filePath, outputDir) {
    const ext = path.extname(filePath).toLowerCase();
    try {
      if (ext === '.cbz') return await this.extractCoverFromZipArchive(filePath, outputDir);
      if (ext === '.cbr') return await this.extractCoverFromRarArchive(filePath, outputDir);
      throw new Error(`Unsupported file type: ${ext}`);
    } catch (error) {
      console.error(`Error extracting cover:`, error);
      throw error;
    }
  }

  /**
   * Extract cover to the public covers directory and return a verified path
   * @param filePath - Path to the comic file
   * @param publicCoversDir - The application's public covers directory
   * @returns Absolute path to the verified cover image
   */
  async extractCoverToPublic(filePath, publicCoversDir) {
    let tempDir = null;
    try {
      await fs.mkdir(publicCoversDir, { recursive: true });
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'comic-cover-'));
      const tempCoverPath = await this.extractCover(filePath, tempDir);
      
      const publicCoverFilename = `comic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-cover.jpg`;
      const publicCoverPath = path.join(publicCoversDir, publicCoverFilename);
      
      await fs.copyFile(tempCoverPath, publicCoverPath);
      
      const stats = await fs.stat(publicCoverPath);
      if (stats.size === 0) throw new Error('Cover file is empty');
      
      return publicCoverPath;
    } finally {
      if (tempDir) await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  /**
   * Extract cover from a CBZ (ZIP) archive
   * @param filePath - Path to the CBZ file
   * @param outputDir - Directory to save the cover
   * @returns Path to the extracted cover
   */
  async extractCoverFromZipArchive(filePath, outputDir) {
    let zip;
    try {
      zip = new StreamZip.async({ file: filePath });
      const entries = await zip.entries();
      const imageFiles = Object.values(entries)
        .filter(e => !e.isDirectory && this.isImageFile(e.name))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

      if (imageFiles.length === 0) throw new Error('No images found in CBZ archive');

      const coverData = await zip.entryData(imageFiles[0]);
      const outputPath = path.join(outputDir, `${path.basename(filePath, '.cbz')}_cover.jpg`);
      
      await fs.mkdir(outputDir, { recursive: true });
      await sharp(coverData)
        .resize(400, 600, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(outputPath);
      
      return outputPath;
    } finally {
      if (zip) await zip.close().catch(() => {});
    }
  }

  /**
   * Extract cover from a CBR (RAR) archive
   * @param filePath - Path to the CBR file
   * @param outputDir - Directory to save the cover
   * @returns Path to the extracted cover
   */
  async extractCoverFromRarArchive(filePath, outputDir) {
    if (!this.unrarAvailable) throw new Error('RAR support is not available');
    let tempDir = null;
    try {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'comic-cover-'));
      await Promise.race([
        this.unrar(filePath, tempDir),
        new Promise((_, reject) => setTimeout(() => reject(new Error('CBR cover extraction timeout')), 30000))
      ]);
      
      const allFiles = await this._walk(tempDir);
      const imageFiles = allFiles
        .filter(file => this.isImageFile(file))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

      if (imageFiles.length === 0) throw new Error('No images found in CBR archive');

      const outputPath = path.join(outputDir, `${path.basename(filePath, '.cbr')}_cover.jpg`);
      await fs.mkdir(outputDir, { recursive: true });
      await sharp(imageFiles[0])
        .resize(400, 600, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(outputPath);
        
      return outputPath;
    } finally {
      if (tempDir) await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  /**
   * Organize a file (move or copy) to the target location
   * @param sourcePath - Original file path
   * @param targetPath - Destination file path
   * @param keepOriginal - If true, copy the file; otherwise, move it
   * @returns True on success
   */
  async organizeFile(sourcePath, targetPath, keepOriginal = false) {
    try {
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      if (keepOriginal) {
        await fs.copyFile(sourcePath, targetPath);
      } else {
        await fs.rename(sourcePath, targetPath);
      }
      return true;
    } catch (error) {
      if (error.code === 'EXDEV' && !keepOriginal) { // Handle cross-device move
        await fs.copyFile(sourcePath, targetPath);
        await fs.unlink(sourcePath);
        return true;
      }
      console.error('Error organizing file:', error);
      throw error;
    }
  }

  /**
   * Move a file from one location to another.
   * @param {string} sourcePath - The current absolute path of the file.
   * @param {string} targetPath - The new absolute path for the file.
   * @returns {Promise<boolean>} - True on success.
   */
  async moveFile(sourcePath, targetPath) {
    try {
      // Ensure target directory exists
      await fs.mkdir(path.dirname(targetPath), { recursive: true });

      // Move the file
      await fs.rename(sourcePath, targetPath);
      return true;
    } catch (error) {
      if (error.code === 'EXDEV') { // Handle cross-device move
        await fs.copyFile(sourcePath, targetPath);
        await fs.unlink(sourcePath);
        return true;
      }
      console.error('Error moving file:', error);
      throw error;
    }
  }

  /**
   * Get a list of page filenames from a comic archive
   * @param filePath - Path to the comic file
   * @returns Array of page filenames
   */
  async getPages(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.cbz') {
      let zip;
      try {
        zip = new StreamZip.async({ file: filePath });
        const entries = await zip.entries();
        return Object.values(entries)
          .filter(e => !e.isDirectory && this.isImageFile(e.name))
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
          .map(e => e.name);
      } finally {
        if (zip) await zip.close().catch(() => {});
      }
    }
    if (ext === '.cbr') {
      // CBR reading for pages is handled by prepareCbrForReading
      throw new Error('Use prepareCbrForReading for CBR page lists');
    }
    throw new Error(`Unsupported file type for page extraction: ${ext}`);
  }

  /**
   * Extract a specific page from a comic archive as a data URL
   * @param filePath - Path to the comic file
   * @param pageName - Filename of the page to extract
   * @returns Data URL of the page image
   */
  async extractPageAsDataUrl(filePath, pageName) {
    const fileType = this.getFileType(filePath);
    if (fileType === 'cbz') {
      let zip;
      try {
        zip = new StreamZip.async({ file: filePath });
        const pageData = await zip.entryData(pageName);
        return `data:${this.getMimeType(pageName)};base64,${pageData.toString('base64')}`;
      } finally {
        if (zip) await zip.close().catch(() => {});
      }
    }
    // CBR page extraction is handled by getPageDataUrlFromTemp
    throw new Error(`Unsupported file type for direct page extraction: ${fileType}`);
  }

  // Get MIME type from filename
  getMimeType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    switch(ext) {
      case '.jpg': case '.jpeg': return 'image/jpeg';
      case '.png': return 'image/png';
      case '.gif': return 'image/gif';
      case '.webp': return 'image/webp';
      case '.bmp': return 'image/bmp';
      default: return 'image/jpeg';
    }
  }

  /**
   * Prepare a CBR file for reading by extracting it to a temporary directory
   * @param filePath - Path to the CBR file
   * @returns Object with temp directory path and list of page filenames
   */
  async prepareCbrForReading(filePath) {
    if (!this.unrarAvailable) throw new Error('RAR support is not available');
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'comic-reader-'));
    try {
      await Promise.race([
        this.unrar(filePath, tempDir),
        new Promise((_, reject) => setTimeout(() => reject(new Error('CBR extraction timeout')), 60000))
      ]);
      const allFiles = await this._walk(tempDir);
      const imageFiles = allFiles
        .filter(file => this.isImageFile(file))
        .map(file => path.relative(tempDir, file).replace(/\\/g, '/'))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
      
      if (imageFiles.length === 0) throw new Error('No image files found in CBR archive');
      return { tempDir, pages: imageFiles };
    } catch (error) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      throw error;
    }
  }

  /**
   * Get a page's data URL from a temporary extraction directory (for CBRs)
   * @param tempDir - Path to the temporary directory
   * @param pageName - Filename of the page
   * @returns Data URL of the page image
   */
  async getPageDataUrlFromTemp(tempDir, pageName) {
    const safePagePath = path.join(tempDir, pageName);
    if (!safePagePath.startsWith(tempDir)) throw new Error('Invalid page path');
    
    const pageData = await fs.readFile(safePagePath);
    return `data:${this.getMimeType(pageName)};base64,${pageData.toString('base64')}`;
  }

  /**
   * Clean up a temporary directory
   * @param tempDir - Path to the directory to clean up
   */
  async cleanupTempDir(tempDir) {
    if (tempDir && tempDir.startsWith(os.tmpdir())) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(e => 
        console.error(`Failed to clean up temp dir ${tempDir}`, e)
      );
    }
  }
}

module.exports = ComicFileHandler;