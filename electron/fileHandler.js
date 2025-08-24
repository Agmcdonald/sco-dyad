const fs = require('fs').promises;
const path = require('path');
const StreamZip = require('node-stream-zip');
const sharp = require('sharp');
const os = require('os');

class ComicFileHandler {
  constructor() {
    this.supportedExtensions = ['.cbr', '.cbz']; // Temporarily removed PDF support
    this.imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    this.unrarAvailable = false;
    this.unrar = null;
    this.initUnrar();
  }

  // Initialize unrar with better error handling
  async initUnrar() {
    try {
      // Try to dynamically import unrar-promise
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

  // Helper function to find all files recursively
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
      // Flatten the array of arrays and filter out empty results
      return files.reduce((all, folderContents) => all.concat(folderContents), []).filter(Boolean);
    } catch (error) {
      console.error(`Error walking directory ${dir}:`, error);
      return [];
    }
  }

  // Check if file is a supported comic format
  isComicFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return this.supportedExtensions.includes(ext);
  }

  // Check if file is an image
  isImageFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return this.imageExtensions.includes(ext);
  }

  // Scan a folder for comic files
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
          // Recursively scan subdirectories
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

  // Get file type based on extension
  getFileType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.cbr': return 'cbr';
      case '.cbz': return 'cbz';
      case '.pdf': return 'pdf'; // Keep for compatibility but won't process
      default: return 'unknown';
    }
  }

  // Read comic file information
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

      // Try to get page count for CBZ/CBR files only
      if (fileInfo.type === 'cbz' || fileInfo.type === 'cbr') {
        try {
          const pageCount = await this.getPageCount(filePath);
          fileInfo.pageCount = pageCount;
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

  // Get page count from comic archive
  async getPageCount(filePath) {
    const fileType = this.getFileType(filePath);
    
    if (fileType === 'cbz') {
      let zip;
      try {
        zip = new StreamZip.async({ file: filePath });
        const entries = await zip.entries();
        const imageFiles = Object.values(entries).filter(entry => 
          !entry.isDirectory && this.isImageFile(entry.name)
        );
        return imageFiles.length;
      } catch (error) {
        console.warn(`Could not get page count for CBZ ${filePath}:`, error.message);
        return 0;
      } finally {
        if (zip) {
          try {
            await zip.close();
          } catch (closeError) {
            console.warn('Error closing zip file:', closeError.message);
          }
        }
      }
    } else if (fileType === 'cbr') {
      if (!this.unrarAvailable || !this.unrar) {
        console.warn('RAR support not available for page count');
        return 0;
      }

      let tempDir = null;
      try {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'comic-pages-'));
        await this.unrar(filePath, tempDir);
        const allFiles = await this._walk(tempDir);
        const imageFiles = allFiles.filter(file => this.isImageFile(file));
        return imageFiles.length;
      } catch (error) {
        console.warn(`Could not get page count for CBR ${filePath}:`, error.message);
        return 0;
      } finally {
        if (tempDir) {
          await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
        }
      }
    } else if (fileType === 'pdf') {
      // PDF support temporarily disabled
      console.warn('PDF support is temporarily disabled');
      return 0;
    }
    return 0;
  }

  // Extract cover image from comic file
  async extractCover(filePath, outputDir) {
    console.log(`[EXTRACT-COVER] Starting cover extraction for: ${filePath}`);
    const ext = path.extname(filePath).toLowerCase();
    console.log(`[EXTRACT-COVER] File extension: ${ext}`);

    try {
      if (ext === '.cbz') {
        return await this.extractCoverFromZipArchive(filePath, outputDir);
      } else if (ext === '.cbr') {
        return await this.extractCoverFromRarArchive(filePath, outputDir);
      } else if (ext === '.pdf') {
        throw new Error('PDF support is temporarily disabled');
      }
      
      throw new Error(`Unsupported file type: ${ext}`);
    } catch (error) {
      console.error(`[EXTRACT-COVER] Error extracting cover:`, error);
      throw error;
    }
  }

  // NEW: Extract cover directly to public directory with web-friendly URL
  async extractCoverToPublic(filePath, publicCoversDir) {
    try {
      console.log('[EXTRACT-COVER-PUBLIC] Starting extraction for:', filePath);
      console.log('[EXTRACT-COVER-PUBLIC] Public covers dir:', publicCoversDir);
      
      // Extract to temporary location first
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'comic-cover-'));
      const tempCoverPath = await this.extractCover(filePath, tempDir);
      
      console.log('[EXTRACT-COVER-PUBLIC] Temp cover extracted to:', tempCoverPath);
      
      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 9);
      const publicCoverFilename = `comic-${timestamp}-${randomId}-cover.jpg`;
      const publicCoverPath = path.join(publicCoversDir, publicCoverFilename);
      
      // Ensure public directory exists
      await fs.mkdir(publicCoversDir, { recursive: true });
      
      // Copy to public directory
      await fs.copyFile(tempCoverPath, publicCoverPath);
      console.log('[EXTRACT-COVER-PUBLIC] Cover copied to:', publicCoverPath);
      
      // Clean up temp directory
      await fs.rm(tempDir, { recursive: true, force: true });
      
      // Return web-accessible URL
      const webUrl = `/covers/${publicCoverFilename}`;
      console.log('[EXTRACT-COVER-PUBLIC] Web URL:', webUrl);
      return webUrl;
      
    } catch (error) {
      console.error('[EXTRACT-COVER-PUBLIC] Error:', error);
      throw error;
    }
  }

  // Extract cover from CBZ (ZIP) archive
  async extractCoverFromZipArchive(filePath, outputDir) {
    let zip;
    try {
      zip = new StreamZip.async({ file: filePath });
      const entries = await zip.entries();
      const imageFiles = Object.values(entries)
        .filter(entry => !entry.isDirectory && this.isImageFile(entry.name))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

      if (imageFiles.length === 0) {
        throw new Error('No images found in CBZ archive');
      }

      const coverEntry = imageFiles[0];
      const coverData = await zip.entryData(coverEntry);
      
      const baseName = path.basename(filePath, path.extname(filePath));
      const outputPath = path.join(outputDir, `${baseName}_cover.jpg`);
      
      await fs.mkdir(outputDir, { recursive: true });
      
      await sharp(coverData)
        .resize(400, 600, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(outputPath);
      
      return outputPath;
    } finally {
      if (zip) {
        try {
          await zip.close();
        } catch (closeError) {
          console.warn('Error closing zip file:', closeError.message);
        }
      }
    }
  }

  // Extract cover from CBR (RAR) archive
  async extractCoverFromRarArchive(filePath, outputDir) {
    if (!this.unrarAvailable || !this.unrar) {
      throw new Error('RAR support is not available');
    }

    let tempDir = null;
    try {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'comic-cover-'));
      await this.unrar(filePath, tempDir);
      
      const allFiles = await this._walk(tempDir);
      const imageFiles = allFiles
        .filter(file => this.isImageFile(file))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

      if (imageFiles.length === 0) {
        throw new Error('No images found in CBR archive');
      }

      const coverPathInTemp = imageFiles[0];
      const baseName = path.basename(filePath, path.extname(filePath));
      const outputPath = path.join(outputDir, `${baseName}_cover.jpg`);
      
      await fs.mkdir(outputDir, { recursive: true });
      
      await sharp(coverPathInTemp)
        .resize(400, 600, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(outputPath);
        
      return outputPath;
    } finally {
      if (tempDir) {
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      }
    }
  }

  // Organize/move a file to the target location
  async organizeFile(sourcePath, targetPath, keepOriginal = false) {
    try {
      const targetDir = path.dirname(targetPath);
      await fs.mkdir(targetDir, { recursive: true });

      if (keepOriginal) {
        await fs.copyFile(sourcePath, targetPath);
      } else {
        try {
          await fs.rename(sourcePath, targetPath);
        } catch (error) {
          if (error.code === 'EXDEV') {
            await fs.copyFile(sourcePath, targetPath);
            
            const parsedSource = path.parse(sourcePath);
            const newSourcePath = path.join(
              parsedSource.dir,
              `${parsedSource.name} (Moved)${parsedSource.ext}`
            );
            await fs.rename(sourcePath, newSourcePath);

          } else {
            throw error;
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Error organizing file:', error);
      throw error;
    }
  }

  // Get list of pages from comic archive
  async getPages(filePath) {
    console.log(`[GET-PAGES] Starting page extraction for: ${filePath}`);
    const ext = path.extname(filePath).toLowerCase();
    console.log(`[GET-PAGES] File extension: ${ext}`);

    if (ext === '.cbz') {
      let zip;
      try {
        zip = new StreamZip.async({ file: filePath });
        const entries = await zip.entries();
        return Object.values(entries)
          .filter(entry => !entry.isDirectory && this.isImageFile(entry.name))
          .sort((a, b) => a.name.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
          .map(entry => entry.name);
      } finally {
        if (zip) {
          try {
            await zip.close();
          } catch (closeError) {
            console.warn('Error closing zip file:', closeError.message);
          }
        }
      }
    }
    
    if (ext === '.cbr') {
      if (!this.unrarAvailable || !this.unrar) {
        throw new Error('RAR support is not available');
      }
      // CBR page extraction would go here
      throw new Error('CBR page extraction not yet implemented');
    }
    
    if (ext === '.pdf') {
      throw new Error('PDF support is temporarily disabled');
    }
    
    console.error(`[GET-PAGES] Unsupported extension: ${ext}. Throwing error.`);
    throw new Error(`Unsupported file type for page extraction: ${ext}`);
  }

  // Extract a specific page from comic archive as a data URL
  async extractPageAsDataUrl(filePath, pageName) {
    const fileType = this.getFileType(filePath);
    
    if (fileType === 'cbz') {
      let zip;
      try {
        zip = new StreamZip.async({ file: filePath });
        const pageData = await zip.entryData(pageName);
        const mimeType = this.getMimeType(pageName);
        return `data:${mimeType};base64,${pageData.toString('base64')}`;
      } finally {
        if (zip) {
          try {
            await zip.close();
          } catch (closeError) {
            console.warn('Error closing zip file:', closeError.message);
          }
        }
      }
    } else if (fileType === 'cbr') {
      throw new Error('CBR page extraction not yet implemented');
    } else if (fileType === 'pdf') {
      throw new Error('PDF support is temporarily disabled');
    }
    
    throw new Error(`Unsupported file type for page extraction: ${fileType}`);
  }

  getMimeType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    switch(ext) {
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.png':
        return 'image/png';
      case '.gif':
        return 'image/gif';
      case '.webp':
        return 'image/webp';
      case '.bmp':
        return 'image/bmp';
      default:
        return 'image/jpeg';
    }
  }

  // Improved CBR reading with better error handling and retry logic
  async prepareCbrForReading(filePath) {
    if (!this.unrarAvailable || !this.unrar) {
      throw new Error('RAR support is not available');
    }

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'comic-reader-'));
    console.log(`[CBR-READER] Preparing CBR for reading: ${filePath}`);
    console.log(`[CBR-READER] Temp directory: ${tempDir}`);
    
    try {
      await this.unrar(filePath, tempDir);
      console.log(`[CBR-READER] Successfully extracted RAR to temp directory`);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const allFiles = await this._walk(tempDir);
      console.log(`[CBR-READER] Found ${allFiles.length} total files in archive`);
      
      const imageFiles = allFiles
        .filter(file => {
          const isImage = this.isImageFile(file);
          if (!isImage) {
            console.log(`[CBR-READER] Skipping non-image file: ${file}`);
          }
          return isImage;
        })
        .map(file => {
          const relativePath = path.relative(tempDir, file).replace(/\\/g, '/');
          console.log(`[CBR-READER] Image file: ${file} -> ${relativePath}`);
          return relativePath;
        })
        .sort((a, b) => {
          return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
        });
      
      console.log(`[CBR-READER] Found ${imageFiles.length} image files`);
      console.log(`[CBR-READER] First few pages:`, imageFiles.slice(0, 5));
      
      if (imageFiles.length === 0) {
        throw new Error('No image files found in CBR archive');
      }
      
      return { tempDir, pages: imageFiles };
    } catch (error) {
      console.error(`[CBR-READER] Failed to prepare CBR for reading: ${filePath}`, error);
      await fs.rm(tempDir, { recursive: true, force: true }).catch(e => 
        console.error(`[CBR-READER] Failed to clean up temp dir ${tempDir}`, e)
      );
      throw error;
    }
  }

  async getPageDataUrlFromTemp(tempDir, pageName) {
    console.log(`[CBR-READER] Getting page data for: ${pageName} from ${tempDir}`);
    
    try {
      const safePagePath = path.join(tempDir, pageName);
      
      if (!safePagePath.startsWith(tempDir)) {
        throw new Error('Invalid page path - security violation');
      }
      
      try {
        await fs.access(safePagePath);
      } catch (error) {
        console.error(`[CBR-READER] File does not exist: ${safePagePath}`);
        
        const allFiles = await this._walk(tempDir);
        const imageFiles = allFiles.filter(file => this.isImageFile(file));
        
        console.log(`[CBR-READER] Available image files:`, imageFiles.map(f => path.relative(tempDir, f)));
        
        const matchingFile = imageFiles.find(file => {
          const relativePath = path.relative(tempDir, file).replace(/\\/g, '/');
          return relativePath.toLowerCase() === pageName.toLowerCase();
        });
        
        if (matchingFile) {
          console.log(`[CBR-READER] Found matching file with different case: ${matchingFile}`);
          const pageData = await fs.readFile(matchingFile);
          const mimeType = this.getMimeType(matchingFile);
          return `data:${mimeType};base64,${pageData.toString('base64')}`;
        }
        
        throw new Error(`Page file not found: ${pageName}`);
      }
      
      const pageData = await fs.readFile(safePagePath);
      const mimeType = this.getMimeType(pageName);
      console.log(`[CBR-READER] Successfully read page data: ${pageData.length} bytes`);
      
      return `data:${mimeType};base64,${pageData.toString('base64')}`;
    } catch (error) {
      console.error(`[CBR-READER] Error reading page ${pageName}:`, error);
      throw error;
    }
  }

  async cleanupTempDir(tempDir) {
    if (tempDir && tempDir.startsWith(os.tmpdir())) {
      console.log(`[CBR-READER] Cleaning up temp directory: ${tempDir}`);
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
        console.log(`[CBR-READER] Successfully cleaned up temp directory`);
      } catch (error) {
        console.error(`[CBR-READER] Failed to clean up temp directory:`, error);
      }
    }
  }
}

module.exports = ComicFileHandler;