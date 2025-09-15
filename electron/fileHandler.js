const fs = require('fs').promises;
const path = require('path');
const StreamZip = require('node-stream-zip');
const sharp = require('sharp');
const os = require('os');
const fsExtra = require('fs-extra'); // Import fs-extra

// --- Canvas Module Conditional Loading ---
let createCanvas;
let canvasAvailable = false;

try {
  // Try to load canvas module. This may fail if native bindings are not built for Electron.
  const canvasModule = require('canvas');
  createCanvas = canvasModule.createCanvas;
  canvasAvailable = true;
  console.log('Canvas module loaded successfully. PDF rendering is enabled.');
} catch (error) {
  console.warn('Canvas module not available. PDF rendering will use a placeholder fallback.', error.message);
  // canvasAvailable remains false, allowing the app to run without crashing.
}

// --- Robust PDF.js Initialization ---
let pdfjs, getDocument, GlobalWorkerOptions;
let pdfjsAvailable = false;

try {
  // Try different possible paths for PDF.js
  let pdfjsModule, pdfjsWorkerPath;
  
  // First try the standard build
  try {
    pdfjsModule = require('pdfjs-dist');
    const pdfjsDistPath = path.dirname(require.resolve('pdfjs-dist/package.json'));
    pdfjsWorkerPath = path.join(pdfjsDistPath, 'build', 'pdf.worker.js');
    
    // Check if worker file exists
    require('fs').accessSync(pdfjsWorkerPath);
    
    pdfjs = pdfjsModule;
    getDocument = pdfjsModule.getDocument;
    GlobalWorkerOptions = pdfjsModule.GlobalWorkerOptions;
    GlobalWorkerOptions.workerSrc = pdfjsWorkerPath;
    
    pdfjsAvailable = true;
    console.log('PDF.js initialized successfully (standard build)');
  } catch (standardError) {
    console.log('Standard PDF.js build not found, trying legacy build...');
    
    // Try legacy build as fallback
    try {
      const pdfjsDistPath = path.dirname(require.resolve('pdfjs-dist/package.json'));
      const pdfjsLegacyPath = path.join(pdfjsDistPath, 'legacy', 'build', 'pdf.js');
      pdfjsWorkerPath = path.join(pdfjsDistPath, 'legacy', 'build', 'pdf.worker.js');

      // Verify that both files exist
      require('fs').accessSync(pdfjsLegacyPath);
      require('fs').accessSync(pdfjsWorkerPath);

      // Require the legacy module
      pdfjsModule = require(pdfjsLegacyPath);
      pdfjs = pdfjsModule;
      getDocument = pdfjsModule.getDocument;
      GlobalWorkerOptions = pdfjsModule.GlobalWorkerOptions;
      GlobalWorkerOptions.workerSrc = pdfjsWorkerPath;
      
      pdfjsAvailable = true;
      console.log('PDF.js initialized successfully (legacy build)');
    } catch (legacyError) {
      console.error('Failed to initialize PDF.js with both standard and legacy builds:', {
        standard: standardError.message,
        legacy: legacyError.message
      });
    }
  }
} catch (error) {
  console.error('Failed to initialize PDF.js. PDF functionality will be disabled.', error.message);
}
// --- End of PDF.js Initialization ---

class ComicFileHandler {
  constructor() {
    this.supportedExtensions = ['.cbr', '.cbz', '.pdf'];
    this.imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    this.unrarAvailable = false;
    this.unrar = null;
    this.pdfjsAvailable = pdfjsAvailable; // Store the status
    this.canvasAvailable = canvasAvailable; // Store canvas availability
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
   * @param signal - AbortSignal for cancellation
   * @returns Array of full file paths
   */
  async _walk(dir, signal) {
    if (signal && signal.aborted) {
      throw new Error('Operation aborted', { name: 'AbortError' });
    }
    try {
      let files = await fs.readdir(dir);
      files = await Promise.all(files.map(async file => {
          if (signal && signal.aborted) {
            throw new Error('Operation aborted', { name: 'AbortError' });
          }
          const filePath = path.join(dir, file);
          try {
            const stats = await fs.stat(filePath);
            if (stats.isDirectory()) return this._walk(filePath, signal);
            else if(stats.isFile()) return filePath;
          } catch (error) {
            console.warn(`[FileHandler] Could not stat file ${filePath}:`, error.message);
            return [];
          }
      }));
      return files.reduce((all, folderContents) => all.concat(folderContents), []).filter(Boolean);
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      console.error(`[FileHandler] Error walking directory ${dir}:`, error);
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
   * @param signal - AbortSignal for cancellation
   * @returns Array of comic file information objects
   */
  async scanFolder(folderPath, signal) {
    if (signal && signal.aborted) {
      throw new Error('Operation aborted', { name: 'AbortError' });
    }
    try {
      const files = [];
      const entries = await fs.readdir(folderPath, { withFileTypes: true });

      for (const entry of entries) {
        if (signal && signal.aborted) {
          throw new Error('Operation aborted', { name: 'AbortError' });
        }
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
          const subFiles = await this.scanFolder(fullPath, signal); // Pass signal recursively
          files.push(...subFiles);
        }
      }
      return files;
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      console.error('[FileHandler] Error scanning folder:', error);
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
   * @param signal - AbortSignal for cancellation
   * @returns File information object, including page count
   */
  async readComicFile(filePath, signal) {
    if (signal && signal.aborted) {
      throw new Error('Operation aborted', { name: 'AbortError' });
    }
    try {
      const stats = await fs.stat(filePath);
      const fileInfo = {
        path: filePath,
        name: path.basename(filePath),
        size: stats.size,
        type: this.getFileType(filePath),
        lastModified: stats.mtime
      };

      if (['cbz', 'cbr', 'pdf'].includes(fileInfo.type)) {
        try {
          fileInfo.pageCount = await this.getPageCount(filePath, signal);
        } catch (error) {
          if (error.name === 'AbortError') throw error;
          console.warn(`[FileHandler] Could not get page count for ${filePath}:`, error.message);
        }
      }
      return fileInfo;
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      console.error(`[FileHandler] Error reading comic file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Get page count from a comic archive or PDF
   * @param filePath - Path to the comic file
   * @param signal - AbortSignal for cancellation
   * @returns Number of image pages in the archive
   */
  async getPageCount(filePath, signal) {
    if (signal && signal.aborted) {
      throw new Error('Operation aborted', { name: 'AbortError' });
    }
    const fileType = this.getFileType(filePath);
    
    if (fileType === 'cbz') {
      let zip;
      try {
        zip = new StreamZip.async({ file: filePath });
        const entries = await zip.entries();
        return Object.values(entries).filter(e => !e.isDirectory && this.isImageFile(e.name)).length;
      } catch (error) {
        if (error.name === 'AbortError') throw error;
        console.error(`[FileHandler] Error getting page count from CBZ file ${filePath}:`, error);
        throw new Error(`Failed to get page count from CBZ: ${error.message}`);
      } finally {
        if (zip) await zip.close().catch(() => {});
      }
    } else if (fileType === 'cbr') {
      if (!this.unrarAvailable) {
        console.warn(`[FileHandler] RAR support not available for ${filePath}. Cannot get page count.`);
        return 0;
      }
      let tempDir = null;
      try {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'comic-pages-'));
        await Promise.race([
          this.unrar(filePath, tempDir, { overwrite: true }), // Added overwrite: true
          new Promise((_, reject) => setTimeout(() => reject(new Error('CBR page count timeout')), 300000)) // Increased timeout to 5 minutes
        ]);
        const allFiles = await this._walk(tempDir, signal); // Pass signal to _walk
        return allFiles.filter(file => this.isImageFile(file)).length;
      } catch (error) {
        if (error.name === 'AbortError') throw error;
        console.error(`[FileHandler] Error getting page count from CBR file ${filePath}:`, error);
        throw new Error(`Failed to get page count from CBR: ${error.message}`);
      } finally {
        if (tempDir) await fsExtra.remove(tempDir).catch(() => {}); // Use fsExtra.remove
      }
    } else if (fileType === 'pdf') {
      if (!this.pdfjsAvailable) {
        console.warn(`[FileHandler] PDF processing is disabled for ${filePath}. Cannot get page count.`);
        return 0;
      }
      try {
        const data = new Uint8Array(await fs.readFile(filePath));
        const pdf = await getDocument(data).promise;
        return pdf.numPages;
      } catch (error) {
        if (error.name === 'AbortError') throw error;
        console.error(`[FileHandler] Error getting page count from PDF file ${filePath}:`, error);
        throw new Error(`Failed to get page count from PDF: ${error.message}`);
      }
    }
    return 0;
  }

  /**
   * Extracts the first image from a RAR archive and saves it as a cover.
   * @param {string} archivePath - Full path to the .cbr file
   * @param {string} outputPath - Path where the cover image should be saved
   */
  async extractCoverFromRarArchive(archivePath, outputPath) {
    if (!this.unrarAvailable) {
      throw new Error('RAR support is not available for CBR cover extraction.');
    }

    let tempDir = null;
    try {
      console.log(`[FileHandler][CBR-COVER] Starting extraction for: ${archivePath}`);
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cbr-cover-'));
      await this.unrar(archivePath, tempDir, { overwrite: true }); // Added overwrite: true

      const allFiles = await this._walk(tempDir);
      const imageFiles = allFiles
        .filter(file => this.isImageFile(file))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

      if (imageFiles.length === 0) {
        throw new Error("No image files found in CBR archive.");
      }

      const imagePath = imageFiles[0];
      const buffer = await fs.readFile(imagePath);

      await fsExtra.ensureDir(path.dirname(outputPath)); // Ensure output directory exists
      await sharp(buffer, { failOnError: true })
        .resize({ width: 400, height: 600, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85, progressive: true })
        .toFile(outputPath);

      console.log(`[FileHandler][CBR-COVER] Saved cover: ${outputPath}`);
      return outputPath;
    } catch (err) {
      console.error("[FileHandler][CBR-COVER] Error extracting cover:", err);
      throw new Error(`CBR cover extraction failed: ${err.message}`);
    } finally {
      if (tempDir) {
        await fsExtra.remove(tempDir).catch(e => console.error(`[FileHandler][CBR-COVER] Error cleaning up temp dir ${tempDir}:`, e));
      }
    }
  }

  /**
   * Extracts the first image from a CBZ (ZIP) archive and saves it as a cover.
   * @param {string} archivePath - Full path to the .cbz file
   * @param {string} outputPath - Path where the cover image should be saved
   */
  async extractCoverFromZipArchive(archivePath, outputPath) {
    let zip;
    try {
      console.log(`[FileHandler][CBZ-COVER] Starting extraction for: ${archivePath}`);
      zip = new StreamZip.async({ file: archivePath });
      const entries = await zip.entries();
      const imageFiles = Object.values(entries)
        .filter(e => !e.isDirectory && this.isImageFile(e.name))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

      if (imageFiles.length === 0) {
        throw new Error('No images found in CBZ archive');
      }

      const coverData = await zip.entryData(imageFiles[0]);
      
      await fsExtra.ensureDir(path.dirname(outputPath)); // Ensure output directory exists
      await sharp(coverData, { failOnError: true })
        .resize({ width: 400, height: 600, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85, progressive: true })
        .toFile(outputPath);
      
      console.log(`[FileHandler][CBZ-COVER] Saved cover: ${outputPath}`);
      return outputPath;
    } catch (error) {
      console.error(`[FileHandler][CBZ-COVER] Error extracting cover:`, error);
      throw new Error(`CBZ cover extraction failed: ${error.message}`);
    } finally {
      if (zip) await zip.close().catch(() => {});
    }
  }

  /**
   * Extracts the first page from a PDF document and saves it as a cover.
   * @param {string} pdfPath - Full path to the .pdf file
   * @param {string} outputPath - Path where the cover image should be saved
   */
  async extractCoverFromPdf(pdfPath, outputPath) {
    if (!this.pdfjsAvailable) throw new Error('PDF processing is disabled.');
    
    await fsExtra.ensureDir(path.dirname(outputPath)); // Ensure output directory exists

    if (this.canvasAvailable) {
      try {
        const data = new Uint8Array(await fs.readFile(pdfPath));
        const pdf = await getDocument(data).promise;
        if (pdf.numPages === 0) {
          throw new Error('PDF has no pages');
        }
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d');

        await page.render({ canvasContext: context, viewport }).promise;

        const buffer = canvas.toBuffer('image/jpeg');
        await sharp(buffer, { failOnError: true })
          .resize({ width: 400, height: 600, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85, progressive: true })
          .toFile(outputPath);
        console.log(`[FileHandler][PDF-COVER] Saved cover (canvas): ${outputPath}`);
      } catch (error) {
        console.error(`[FileHandler][PDF-COVER] Error rendering PDF cover with canvas:`, error);
        throw new Error(`Failed to render PDF cover: ${error.message}`);
      }
    } else {
      console.warn(`[FileHandler][PDF-COVER] Canvas not available. Creating placeholder cover for PDF ${pdfPath}.`);
      try {
        const data = new Uint8Array(await fs.readFile(pdfPath));
        const pdf = await getDocument(data).promise;
        
        if (pdf.numPages === 0) {
          throw new Error('PDF has no pages');
        }

        const svg = `
          <svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
            <rect width="400" height="600" fill="#f0f0f0"/>
            <text x="200" y="280" text-anchor="middle" font-size="24" fill="#333">PDF Document</text>
            <text x="200" y="320" text-anchor="middle" font-size="16" fill="#666">${pdf.numPages} pages</text>
            <text x="200" y="360" text-anchor="middle" font-size="12" fill="#999">${path.basename(pdfPath, '.pdf')}</text>
          </svg>
        `;

        await sharp(Buffer.from(svg), { failOnError: true })
          .jpeg({ quality: 85, progressive: true })
          .toFile(outputPath);
        console.log(`[FileHandler][PDF-COVER] Saved cover (placeholder): ${outputPath}`);
      } catch (error) {
        console.error(`[FileHandler][PDF-COVER] Error creating placeholder PDF cover:`, error);
        throw new Error(`Failed to create placeholder PDF cover: ${error.message}`);
      }
    }
    return outputPath;
  }

  /**
   * Extracts a cover image from a comic archive (.cbr, .cbz, .pdf) or a direct image file.
   * This acts as a dispatcher to the specific extraction methods.
   * @param {string} sourcePath - Full path to the comic file or image file
   * @param {string} outputPath - Path where the cover image should be saved
   */
  async extractCover(sourcePath, outputPath) {
    const ext = path.extname(sourcePath).toLowerCase();
    console.log(`[FileHandler] extractCover called for ${sourcePath} (ext: ${ext})`);

    try {
      if (ext === ".cbr") {
        return await this.extractCoverFromRarArchive(sourcePath, outputPath);
      } else if (ext === ".cbz") {
        return await this.extractCoverFromZipArchive(sourcePath, outputPath);
      } else if (ext === ".pdf") {
        return await this.extractCoverFromPdf(sourcePath, outputPath);
      } else if (this.isImageFile(sourcePath)) {
        // Handle direct image files
        const buffer = await fs.readFile(sourcePath);
        await fsExtra.ensureDir(path.dirname(outputPath)); // Ensure output directory exists
        await sharp(buffer, { failOnError: true })
          .resize({ width: 400, height: 600, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85, progressive: true })
          .toFile(outputPath);
        console.log(`[FileHandler] Saved direct image cover: ${outputPath}`);
        return outputPath;
      } else {
        throw new Error(`Unsupported file type for cover extraction: ${ext}`);
      }
    } catch (err) {
      console.error("[FileHandler] extractCover error:", err);
      throw new Error(`Cover extraction failed: ${err.message}`);
    }
  }

  /**
   * Extracts a cover image and moves it to the public covers directory.
   * This function generates a unique filename for the cover.
   * @param {string} filePath - Path to the original comic file
   * @param {string} publicCoversDir - The application's public covers directory
   * @returns {Promise<string>} - Absolute path to the saved cover image in the public directory.
   */
  async extractCoverToPublic(filePath, publicCoversDir) {
    console.log(`[FileHandler] extractCoverToPublic called for: ${filePath}`);

    let tempCoverPath = null;
    try {
      if (!publicCoversDir) {
        throw new Error("publicCoversDir is not defined.");
      }
      await fsExtra.ensureDir(publicCoversDir);

      // Extract to a temporary location first
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'comic-cover-temp-'));
      tempCoverPath = path.join(tempDir, `temp_cover.jpg`);
      
      await this.extractCover(filePath, tempCoverPath); // Use the main extractCover dispatcher

      // Generate a unique filename for the public cover
      const publicCoverFilename = `comic-${Date.now()}-${Math.random().toString(36).slice(2, 11)}-cover.jpg`;
      const publicCoverPath = path.join(publicCoversDir, publicCoverFilename);
      
      // Move the processed cover from temp to public directory
      await fs.copyFile(tempCoverPath, publicCoverPath);
      
      const stats = await fs.stat(publicCoverPath);
      if (stats.size === 0) throw new Error('Cover file is empty after copy');
      
      console.log(`[FileHandler] Cover successfully moved to public: ${publicCoverPath}`);
      return publicCoverPath;
    } catch (error) {
      console.error(`[FileHandler] Error extracting cover to public directory for ${filePath}:`, error);
      throw error;
    } finally {
      if (tempCoverPath) {
        await fsExtra.remove(path.dirname(tempCoverPath)).catch(e => console.error(`[FileHandler] Error cleaning up temp dir for cover:`, e));
      }
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
      console.error(`[FileHandler] Error organizing file from ${sourcePath} to ${targetPath}:`, error);
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
      console.error(`[FileHandler] Error moving file from ${sourcePath} to ${targetPath}:`, error);
      throw error;
    }
  }

  /**
   * Get a list of page filenames from a comic archive
   * @param filePath - Path to the comic file
   * @returns Array of page filenames or numbers
   */
  async getPages(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
      case '.cbz': {
        let zip;
        try {
          zip = new StreamZip.async({ file: filePath });
          const entries = await zip.entries();
          return Object.values(entries)
            .filter(e => !e.isDirectory && this.isImageFile(e.name))
            .sort((a, b) => a.name.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
            .map(e => e.name);
        } catch (error) {
          console.error(`[FileHandler] Error reading CBZ file ${filePath} for pages:`, error);
          throw new Error(`Failed to read CBZ file pages: ${error.message}`);
        } finally {
          if (zip) await zip.close().catch(() => {});
        }
      }
      
      case '.cbr':
        // For CBR files, the entire archive is extracted to a temporary directory for reading.
        // The list of pages is generated during that process by `prepareCbrForReading`.
        // This `getPages` method is for quick info and doesn't perform a full extraction.
        // The ComicReader component handles this by calling prepareCbrForReading directly.
        // We throw here to indicate that a different method is required for CBR page lists.
        throw new Error('Use prepareCbrForReading for CBR page lists');
      
      case '.pdf': {
        if (!this.pdfjsAvailable) {
          console.error(`[FileHandler] PDF processing is disabled for ${filePath}. Cannot get pages.`);
          throw new Error('PDF processing is disabled. Cannot get pages from PDF.');
        }
        try {
          const pageCount = await this.getPageCount(filePath);
          return Array.from({ length: pageCount }, (_, i) => String(i + 1));
        } catch (error) {
          console.error(`[FileHandler] Error getting pages from PDF ${filePath}:`, error);
          throw new Error(`Failed to get pages from PDF: ${error.message}`);
        }
      }

      default:
        throw new Error(`Unsupported file type for page extraction: ${ext}`);
    }
  }

  /**
   * Extract a specific page from a comic archive as a data URL
   * @param filePath - Path to the comic file
   * @param pageName - Filename or page number of the page to extract
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
      } catch (error) {
        console.error(`[FileHandler] Error extracting page ${pageName} from CBZ ${filePath}:`, error);
        throw new Error(`Failed to extract page from CBZ: ${error.message}`);
      } finally {
        if (zip) await zip.close().catch(() => {});
      }
    }
    if (fileType === 'pdf') {
      if (!this.pdfjsAvailable) throw new Error('PDF processing is disabled.');
      
      const pageNumber = parseInt(pageName, 10);
      if (isNaN(pageNumber)) throw new Error('Invalid page number for PDF');

      try {
        const data = new Uint8Array(await fs.readFile(filePath));
        const pdf = await getDocument(data).promise;
        if (pageNumber < 1 || pageNumber > pdf.numPages) {
          throw new Error(`Page number ${pageNumber} is out of range.`);
        }

        if (this.canvasAvailable) {
          // Use canvas if available
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = createCanvas(viewport.width, viewport.height);
          const context = canvas.getContext('2d');

          await page.render({ canvasContext: context, viewport }).promise;
          return canvas.toDataURL('image/jpeg');
        } else {
          // Alternative: Return a placeholder or basic page info
          console.warn(`[FileHandler] Canvas not available. Cannot render PDF page ${pageNumber} as image for ${filePath}.`);
          
          // Create a simple SVG placeholder with page info
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.0 });
          
          const svg = `
            <svg width="${viewport.width}" height="${viewport.height}" xmlns="http://www.w3.org/2000/svg">
              <rect width="${viewport.width}" height="${viewport.height}" fill="#f8f8f8"/>
              <text x="${viewport.width/2}" y="${viewport.height/2}" text-anchor="middle" font-size="24" fill="#666">
                Page ${pageNumber} of ${pdf.numPages}
              </text>
              <text x="${viewport.width/2}" y="${viewport.height/2 + 40}" text-anchor="middle" font-size="16" fill="#999">
                PDF rendering requires canvas module
              </text>
            </svg>
          `;
          
          const buffer = Buffer.from(svg);
          return `data:image/svg+xml;base64,${buffer.toString('base64')}`;
        }
      } catch (error) {
        console.error(`[FileHandler] Error extracting page ${pageName} from PDF ${filePath}:`, error);
        throw new Error(`Failed to extract page from PDF: ${error.message}`);
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
    if (!this.unrarAvailable) {
      console.error(`[FileHandler] CBR: RAR support is not available for ${filePath}`);
      throw new Error('RAR support is not available');
    }
    console.log(`[FileHandler] CBR: Starting prepareCbrForReading for ${filePath}`);
    let tempDir = null;
    try {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'comic-reader-'));
      console.log(`[FileHandler] CBR: Created temp dir ${tempDir}`);
      
      console.log(`[FileHandler] CBR: Starting unrar extraction for ${filePath} to ${tempDir}`);
      await Promise.race([
        this.unrar(filePath, tempDir, { overwrite: true }), // Added overwrite: true
        new Promise((_, reject) => setTimeout(() => reject(new Error('CBR extraction timeout')), 300000)) // Increased timeout to 5 minutes
      ]);
      console.log(`[FileHandler] CBR: Unrar extraction complete for ${filePath}`);

      console.log(`[FileHandler] CBR: Walking temp dir ${tempDir} for image files`);
      const allFiles = await this._walk(tempDir);
      const imageFiles = allFiles
        .filter(file => this.isImageFile(file))
        .map(file => path.relative(tempDir, file).replace(/\\/g, '/'))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
      
      if (imageFiles.length === 0) {
        console.error(`[FileHandler] CBR: No image files found in extracted archive for ${filePath}`);
        throw new Error('No image files found in CBR archive');
      }
      console.log(`[FileHandler] CBR: Found ${imageFiles.length} image files.`);
      return { tempDir, pages: imageFiles };
    } catch (error) {
      console.error(`[FileHandler] CBR: Error preparing CBR ${filePath} for reading:`, error);
      if (tempDir) {
        console.log(`[FileHandler] CBR: Cleaning up temp dir ${tempDir} after error.`);
        await fsExtra.remove(tempDir).catch(e => console.error(`[FileHandler] CBR: Error cleaning up temp dir ${tempDir} after failed CBR prep:`, e)); // Use fsExtra.remove
      }
      throw new Error(`Failed to prepare CBR for reading: ${error.message}`);
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
    // Basic security check to ensure we don't read outside the tempDir
    if (!safePagePath.startsWith(tempDir)) {
      console.error(`[FileHandler] Attempted to access path outside temp directory: ${safePagePath}`);
      throw new Error('Invalid page path: Attempted to access file outside designated temporary directory.');
    }
    
    try {
      const pageData = await fs.readFile(safePagePath);
      return `data:${this.getMimeType(pageName)};base64,${pageData.toString('base64')}`;
    } catch (error) {
      console.error(`[FileHandler] Error getting page data from temp ${safePagePath}:`, error);
      throw new Error(`Failed to get page data from temp: ${error.message}`);
    }
  }

  /**
   * Clean up a temporary directory
   * @param tempDir - Path to the directory to clean up
   */
  async cleanupTempDir(tempDir) {
    if (tempDir && tempDir.startsWith(os.tmpdir())) {
      console.log(`[FileHandler] Cleaning up temp dir ${tempDir}`);
      await fsExtra.remove(tempDir).catch(e => // Use fsExtra.remove
        console.error(`[FileHandler] Failed to clean up temp dir ${tempDir}`, e)
      );
    } else {
      console.warn(`[FileHandler] Attempted to clean up non-temp or invalid directory: ${tempDir}`);
    }
  }
}

module.exports = ComicFileHandler;