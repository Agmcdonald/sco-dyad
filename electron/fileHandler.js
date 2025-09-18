const fs = require('fs').promises;
const path = require('path');
const StreamZip = require('node-stream-zip');
const sharp = require('sharp');
const os = require('os');
const fsExtra = require('fs-extra');
const { app } = require('electron');

// --- Pre-computation and Configuration ---

if (app.isPackaged) {
  sharp.simd(false);
  sharp.cache(false);
  console.log('[SHARP] Running in packaged mode - SIMD disabled');
}

/**
 * @function debugSharpOptions
 * @summary Logs the environment state for debugging Sharp library issues.
 */
function debugSharpOptions() {
  const testValues = {
    'isPackaged': app.isPackaged,
    'env.NODE_ENV': process.env.NODE_ENV,
  };
  console.log('[SHARP-DEBUG] Environment state:', JSON.stringify(testValues, null, 2));
}
debugSharpOptions();

/**
 * @async
 * @function writeCover
 * @summary Resizes, optimizes, and writes an image buffer or path to a file.
 * @param {Buffer|string} bufferOrPath - The input image buffer or path to the image file.
 * @param {string} outputPath - The path to save the processed cover image.
 * @returns {Promise<string>} The path to the successfully written cover.
 */
async function writeCover(bufferOrPath, outputPath) {
  return new Promise((resolve, reject) => {
    const inputDesc = Buffer.isBuffer(bufferOrPath)
      ? `Buffer(${bufferOrPath.length})`
      : `Path(${String(bufferOrPath)})`;
    console.log('[FileHandler][COVER] sharp input:', inputDesc, '→', outputPath);

    sharp(bufferOrPath)
      .resize(400, 600, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({
        quality: 82,
        mozjpeg: true
      })
      .toBuffer((err, buffer) => {
        if (err) {
          console.error('[FileHandler][COVER] sharp toBuffer failed:', err);
          reject(err);
          return;
        }

        fs.writeFile(outputPath, buffer)
          .then(() => {
            console.log('[FileHandler][COVER] Successfully wrote:', outputPath);
            resolve(outputPath);
          })
          .catch(reject);
      });
  });
}

// --- Conditional Module Loading ---

let createCanvas;
let canvasAvailable = false;
try {
  const canvasModule = require('canvas');
  createCanvas = canvasModule.createCanvas;
  canvasAvailable = true;
  console.log('Canvas module loaded successfully. PDF rendering is enabled.');
} catch (error) {
  console.warn('Canvas module not available. PDF rendering will use a placeholder fallback.', error.message);
}

let pdfjs, getDocument, GlobalWorkerOptions;
let pdfjsAvailable = false;
try {
  let pdfjsModule, pdfjsWorkerPath;
  try {
    pdfjsModule = require('pdfjs-dist');
    const pdfjsDistPath = path.dirname(require.resolve('pdfjs-dist/package.json'));
    pdfjsWorkerPath = path.join(pdfjsDistPath, 'build', 'pdf.worker.js');
    require('fs').accessSync(pdfjsWorkerPath);
    
    pdfjs = pdfjsModule;
    getDocument = pdfjsModule.getDocument;
    GlobalWorkerOptions = pdfjsModule.GlobalWorkerOptions;
    GlobalWorkerOptions.workerSrc = pdfjsWorkerPath;
    
    pdfjsAvailable = true;
    console.log('PDF.js initialized successfully (standard build)');
  } catch (standardError) {
    console.log('Standard PDF.js build not found, trying legacy build...');
    try {
      const pdfjsDistPath = path.dirname(require.resolve('pdfjs-dist/package.json'));
      const pdfjsLegacyPath = path.join(pdfjsDistPath, 'legacy', 'build', 'pdf.js');
      pdfjsWorkerPath = path.join(pdfjsDistPath, 'legacy', 'build', 'pdf.worker.js');
      require('fs').accessSync(pdfjsLegacyPath);
      require('fs').accessSync(pdfjsWorkerPath);

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

/**
 * @class ComicFileHandler
 * @summary Handles all file system operations related to comic book files.
 * @description This class is responsible for reading comic archives (CBR, CBZ, PDF),
 * extracting covers and pages, scanning folders for comics, and organizing files.
 * It gracefully handles the absence of optional native dependencies like `unrar` and `canvas`.
 */
class ComicFileHandler {
  /**
   * @constructor
   * @description Initializes supported file extensions and attempts to load optional dependencies.
   */
  constructor() {
    this.supportedExtensions = ['.cbr', '.cbz', '.pdf'];
    this.imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    this.unrarAvailable = false;
    this.unrar = null;
    this.pdfjsAvailable = pdfjsAvailable;
    this.canvasAvailable = canvasAvailable;
    this.initUnrar();
  }

  /**
   * @async
   * @function initUnrar
   * @summary Initializes the `unrar-promise` module for CBR support.
   * @description Dynamically imports the `unrar-promise` library. If the import fails,
   * RAR support is disabled, allowing the application to continue running.
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
   * @async
   * @private
   * @function _walk
   * @summary Recursively walks a directory to find all files.
   * @param {string} dir - The directory to walk.
   * @param {AbortSignal} [signal] - An AbortSignal to cancel the operation.
   * @returns {Promise<string[]>} An array of full file paths.
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

  /**
   * @function isComicFile
   * @summary Checks if a file is a supported comic format.
   * @param {string} filePath - The path to the file.
   * @returns {boolean} True if the file is a supported comic type.
   */
  isComicFile(filePath) {
    return this.supportedExtensions.includes(path.extname(filePath).toLowerCase());
  }

  /**
   * @function isImageFile
   * @summary Checks if a file is a supported image format.
   * @param {string} filePath - The path to the file.
   * @returns {boolean} True if the file is a supported image type.
   */
  isImageFile(filePath) {
    return this.imageExtensions.includes(path.extname(filePath).toLowerCase());
  }

  /**
   * @async
   * @function readComicFile
   * @summary Reads metadata for a single comic file.
   * @param {string} filePath - Path to the comic file.
   * @param {AbortSignal} [signal] - An AbortSignal to cancel the operation.
   * @returns {Promise<object>} A file information object, including page count.
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
   * @function getFileType
   * @summary Determines the file type from its extension.
   * @param {string} filePath - The path to the file.
   * @returns {string} The file type ('cbr', 'cbz', 'pdf', or 'unknown').
   */
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
   * @async
   * @function getPageCount
   * @summary Gets the number of pages in a comic archive or PDF.
   * @param {string} filePath - Path to the comic file.
   * @param {AbortSignal} [signal] - An AbortSignal to cancel the operation.
   * @returns {Promise<number>} The number of image pages in the file.
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
      if (!this.unrarAvailable || !this.unrar) {
        console.warn(`[FileHandler] RAR support not available for ${filePath}. Cannot get page count.`);
        return 0;
      }
      let tempDir = null;
      try {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'comic-pages-'));
        await Promise.race([
          this.unrar(filePath, tempDir, { overwrite: true }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('CBR page count timeout')), 300000))
        ]);
        const allFiles = await this._walk(tempDir, signal);
        return allFiles.filter(file => this.isImageFile(file)).length;
      } catch (error) {
        if (error.name === 'AbortError') throw error;
        console.error(`[FileHandler] Error getting page count from CBR file ${filePath}:`, error);
        throw new Error(`Failed to get page count from CBR: ${error.message}`);
      } finally {
        if (tempDir) await fsExtra.remove(tempDir).catch(() => {});
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
   * @async
   * @function extractCoverFromRarArchive
   * @summary Extracts the first image from a RAR archive (.cbr) and saves it as a cover.
   * @param {string} archivePath - Full path to the .cbr file.
   * @param {string} outputPath - Path where the cover image should be saved.
   * @returns {Promise<string>} The path to the saved cover image.
   */
  async extractCoverFromRarArchive(archivePath, outputPath) {
    if (!this.unrarAvailable || !this.unrar) {
      throw new Error('RAR support is not available for CBR cover extraction.');
    }
    console.log(`[FileHandler][CBR-COVER] Starting extraction for: ${archivePath}`);

    let tempDir = null;
    try {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cbr-cover-'));
      
      await Promise.race([
        this.unrar(archivePath, tempDir, { overwrite: true }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('CBR cover extraction timeout')), 300000))
      ]);

      const allFiles = await this._walk(tempDir);
      const imageFiles = allFiles
        .filter(file => this.isImageFile(file))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

      if (imageFiles.length === 0) {
        throw new Error("No image files found in CBR archive.");
      }

      const firstImageFullPath = imageFiles[0];
      const firstImageName = path.basename(firstImageFullPath);
      const firstImageBuffer = await fs.readFile(firstImageFullPath);
      if (!firstImageBuffer || firstImageBuffer.length === 0) {
        throw new Error('[CBR] First image buffer is empty');
      }
      console.log('[CBR] Processing image:', firstImageName, 'Size:', firstImageBuffer.length);
      await writeCover(firstImageBuffer, outputPath);
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
   * @async
   * @function extractCoverFromZipArchive
   * @summary Extracts the first image from a CBZ (ZIP) archive and saves it as a cover.
   * @param {string} archivePath - Full path to the .cbz file.
   * @param {string} outputPath - Path where the cover image should be saved.
   * @returns {Promise<string>} The path to the saved cover image.
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

      const firstImageEntry = imageFiles[0];
      const buffer = await zip.entryData(firstImageEntry.name);
      if (!buffer || buffer.length === 0) {
        throw new Error('[CBZ] First image buffer is empty');
      }
      console.log('[CBZ] Processing image:', firstImageEntry.name, 'Size:', buffer.length);
      await writeCover(buffer, outputPath);
      return outputPath;
    } catch (error) {
      console.error(`[FileHandler][CBZ-COVER] Error extracting cover:`, error);
      throw new Error(`CBZ cover extraction failed: ${error.message}`);
    } finally {
      if (zip) await zip.close().catch(() => {});
    }
  }

  /**
   * @async
   * @function extractCoverFromPdf
   * @summary Extracts the first page from a PDF document and saves it as a cover.
   * @param {string} pdfPath - Full path to the .pdf file.
   * @param {string} outputPath - Path where the cover image should be saved.
   * @returns {Promise<string>} The path to the saved cover image.
   */
  async extractCoverFromPdf(pdfPath, outputPath) {
    if (!this.pdfjsAvailable) throw new Error('PDF processing is disabled.');
    
    await fsExtra.ensureDir(path.dirname(outputPath));

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

        const imageBuffer = canvas.toBuffer('image/jpeg');
        console.log('[PDF] Processing rendered page, Size:', imageBuffer.length);
        await writeCover(imageBuffer, outputPath);
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
        const imageBuffer = Buffer.from(svg);
        console.log('[PDF] Processing rendered page, Size:', imageBuffer.length);
        await writeCover(imageBuffer, outputPath);
      } catch (error) {
        console.error(`[FileHandler][PDF-COVER] Error creating placeholder PDF cover:`, error);
        throw new Error(`Failed to create placeholder PDF cover: ${error.message}`);
      }
    }
    return outputPath;
  }

  /**
   * @async
   * @function extractCover
   * @summary Dispatches cover extraction to the appropriate method based on file type.
   * @param {string} sourcePath - Full path to the comic or image file.
   * @param {string} outputPath - Path where the cover image should be saved.
   * @returns {Promise<string>} The path to the saved cover image.
   */
  async extractCover(sourcePath, outputPath) {
    const ext = path.extname(sourcePath).toLowerCase();
    console.log(`[FileHandler] extractCover dispatcher called for ${sourcePath} (ext: ${ext})`);

    try {
      if (ext === ".cbr") {
        return await this.extractCoverFromRarArchive(sourcePath, outputPath);
      } else if (ext === ".cbz") {
        return await this.extractCoverFromZipArchive(sourcePath, outputPath);
      } else if (ext === ".pdf") {
        return await this.extractCoverFromPdf(sourcePath, outputPath);
      } else if (this.isImageFile(sourcePath)) {
        console.log('[IMAGE] Processing direct image file:', ext);
        await writeCover(sourcePath, outputPath);
        return outputPath;
      } else {
        throw new Error(`Unsupported file type for cover extraction: ${ext}`);
      }
    } catch (err) {
      console.error("[FileHandler] extractCover dispatcher error:", err);
      throw new Error(`Cover extraction failed: ${err.message}`);
    }
  }

  /**
   * @async
   * @function extractCoverToPublic
   * @summary Extracts a cover and saves it to the public covers directory with a unique name.
   * @param {string} filePath - Path to the original comic file.
   * @param {string} publicCoversDir - The application's public covers directory.
   * @returns {Promise<string>} Absolute path to the saved cover image.
   */
  async extractCoverToPublic(filePath, publicCoversDir) {
    console.log(`[FileHandler] extractCoverToPublic called for: ${filePath}`);

    let tempCoverPath = null;
    try {
      if (!publicCoversDir) {
        throw new Error("publicCoversDir is not defined.");
      }
      await fsExtra.ensureDir(publicCoversDir);

      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'comic-cover-temp-'));
      tempCoverPath = path.join(tempDir, `temp_cover.jpg`);
      
      await this.extractCover(filePath, tempCoverPath); 

      const publicCoverFilename = `comic-${Date.now()}-${Math.random().toString(36).slice(2, 11)}-cover.jpg`;
      const publicCoverPath = path.join(publicCoversDir, publicCoverFilename);
      
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
   * @async
   * @function organizeFile
   * @summary Moves or copies a file to a target location.
   * @param {string} sourcePath - Original file path.
   * @param {string} targetPath - Destination file path.
   * @param {boolean} [keepOriginal=false] - If true, copy the file; otherwise, move it.
   * @returns {Promise<boolean>} True on success.
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
      if (error.code === 'EXDEV' && !keepOriginal) {
        await fs.copyFile(sourcePath, targetPath);
        await fs.unlink(sourcePath);
        return true;
      }
      console.error(`[FileHandler] Error organizing file from ${sourcePath} to ${targetPath}:`, error);
      throw error;
    }
  }

  /**
   * @async
   * @function moveFile
   * @summary Moves a file to a new location.
   * @param {string} sourcePath - The current absolute path of the file.
   * @param {string} targetPath - The new absolute path for the file.
   * @returns {Promise<{success: boolean, newPath: string}>} An object indicating success and the new path.
   */
  async moveFile(sourcePath, targetPath) {
    try {
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.rename(sourcePath, targetPath);
      return { success: true, newPath: targetPath };
    } catch (error) {
      if (error.code === 'EXDEV') {
        await fs.copyFile(sourcePath, targetPath);
        await fs.unlink(sourcePath);
        return { success: true, newPath: targetPath };
      }
      console.error(`[FileHandler] Error moving file from ${sourcePath} to ${targetPath}:`, error);
      throw error;
    }
  }

  /**
   * @async
   * @function getPages
   * @summary Gets a list of page filenames from a comic archive.
   * @param {string} filePath - Path to the comic file.
   * @returns {Promise<string[]>} An array of page filenames or page numbers (for PDFs).
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
   * @async
   * @function extractPageAsDataUrl
   * @summary Extracts a specific page from a comic as a data URL.
   * @param {string} filePath - Path to the comic file.
   * @param {string} pageName - Filename (for CBZ) or page number (for PDF) of the page to extract.
   * @returns {Promise<string>} A data URL of the page image.
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
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = createCanvas(viewport.width, viewport.height);
          const context = canvas.getContext('2d');

          await page.render({ canvasContext: context, viewport }).promise;
          return canvas.toDataURL('image/jpeg');
        } else {
          console.warn(`[FileHandler] Canvas not available. Cannot render PDF page ${pageNumber} as image for ${filePath}.`);
          
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
    throw new Error(`Unsupported file type for direct page extraction: ${fileType}`);
  }

  /**
   * @function getMimeType
   * @summary Gets the MIME type from a filename.
   * @param {string} fileName - The name of the file.
   * @returns {string} The corresponding MIME type.
   */
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
   * @async
   * @function prepareCbrForReading
   * @summary Prepares a CBR file for reading by extracting it to a temporary directory.
   * @param {string} filePath - Path to the CBR file.
   * @returns {Promise<{tempDir: string, pages: string[]}>} An object with the temp directory path and a list of page filenames.
   */
  async prepareCbrForReading(filePath) {
    if (!this.unrarAvailable || !this.unrar) {
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
        this.unrar(filePath, tempDir, { overwrite: true }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('CBR extraction timeout')), 300000))
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
        await fsExtra.remove(tempDir).catch(e => console.error(`[FileHandler] CBR: Error cleaning up temp dir ${tempDir} after failed CBR prep:`, e));
      }
      throw new Error(`Failed to prepare CBR for reading: ${error.message}`);
    }
  }

  /**
   * @async
   * @function getPageDataUrlFromTemp
   * @summary Gets a page's data URL from a temporary directory (for CBRs).
   * @param {string} tempDir - Path to the temporary directory.
   * @param {string} pageName - Filename of the page within the temp directory.
   * @returns {Promise<string>} A data URL of the page image.
   */
  async getPageDataUrlFromTemp(tempDir, pageName) {
    const safePagePath = path.join(tempDir, pageName);
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
   * @async
   * @function cleanupTempDir
   * @summary Cleans up a temporary directory.
   * @param {string} tempDir - Path to the directory to clean up.
   */
  async cleanupTempDir(tempDir) {
    if (tempDir && tempDir.startsWith(os.tmpdir())) {
      console.log(`[FileHandler] Cleaning up temp dir ${tempDir}`);
      await fsExtra.remove(tempDir).catch(e =>
        console.error(`[FileHandler] Failed to clean up temp dir ${tempDir}`, e)
      );
    } else {
      console.warn(`[FileHandler] Attempted to clean up non-temp or invalid directory: ${tempDir}`);
    }
  }
}

module.exports = ComicFileHandler;