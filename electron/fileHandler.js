const fs = require('fs').promises;
const path = require('path');
const StreamZip = require('node-stream-zip');
const sharp = require('sharp');

class ComicFileHandler {
  constructor() {
    this.supportedExtensions = ['.cbr', '.cbz', '.pdf'];
    this.imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
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
      case '.pdf': return 'pdf';
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

      // Try to get page count for CBZ/CBR files
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
    const zip = new StreamZip.async({ file: filePath });
    try {
      const entries = await zip.entries();
      const imageFiles = Object.values(entries).filter(entry => 
        !entry.isDirectory && this.isImageFile(entry.name)
      );
      return imageFiles.length;
    } finally {
      await zip.close();
    }
  }

  // Extract cover image from comic file
  async extractCover(filePath, outputDir) {
    try {
      const fileType = this.getFileType(filePath);
      
      if (fileType === 'cbz' || fileType === 'cbr') {
        return await this.extractCoverFromArchive(filePath, outputDir);
      } else if (fileType === 'pdf') {
        // PDF cover extraction would require additional libraries like pdf-poppler
        throw new Error('PDF cover extraction not yet implemented');
      }
      
      throw new Error(`Unsupported file type: ${fileType}`);
    } catch (error) {
      console.error('Error extracting cover:', error);
      throw error;
    }
  }

  // Extract cover from CBZ/CBR archive
  async extractCoverFromArchive(filePath, outputDir) {
    const zip = new StreamZip.async({ file: filePath });
    
    try {
      const entries = await zip.entries();
      
      // Find image files and sort them to get the first one (likely the cover)
      const imageFiles = Object.values(entries)
        .filter(entry => !entry.isDirectory && this.isImageFile(entry.name))
        .sort((a, b) => a.name.localeCompare(b.name));

      if (imageFiles.length === 0) {
        throw new Error('No images found in comic archive');
      }

      const coverEntry = imageFiles[0];
      const coverData = await zip.entryData(coverEntry);
      
      // Generate output filename
      const baseName = path.basename(filePath, path.extname(filePath));
      const outputPath = path.join(outputDir, `${baseName}_cover.jpg`);
      
      // Ensure output directory exists
      await fs.mkdir(outputDir, { recursive: true });
      
      // Process and save the cover image
      await sharp(coverData)
        .resize(400, 600, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(outputPath);
      
      return outputPath;
    } finally {
      await zip.close();
    }
  }

  // Organize/move a file to the target location
  async organizeFile(sourcePath, targetPath, keepOriginal = false) {
    try {
      // Ensure target directory exists
      const targetDir = path.dirname(targetPath);
      await fs.mkdir(targetDir, { recursive: true });

      if (keepOriginal) {
        // Copy the file
        await fs.copyFile(sourcePath, targetPath);
      } else {
        // Move the file
        await fs.rename(sourcePath, targetPath);
      }

      return true;
    } catch (error) {
      console.error('Error organizing file:', error);
      throw error;
    }
  }

  // Get list of pages from comic archive
  async getPages(filePath) {
    const fileType = this.getFileType(filePath);
    
    if (fileType === 'cbz' || fileType === 'cbr') {
      const zip = new StreamZip.async({ file: filePath });
      
      try {
        const entries = await zip.entries();
        const imageFiles = Object.values(entries)
          .filter(entry => !entry.isDirectory && this.isImageFile(entry.name))
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((entry, index) => ({
            index: index + 1,
            name: entry.name,
            size: entry.size
          }));

        return imageFiles;
      } finally {
        await zip.close();
      }
    }
    
    throw new Error(`Unsupported file type for page extraction: ${fileType}`);
  }

  // Extract a specific page from comic archive
  async extractPage(filePath, pageIndex, outputDir) {
    const zip = new StreamZip.async({ file: filePath });
    
    try {
      const entries = await zip.entries();
      const imageFiles = Object.values(entries)
        .filter(entry => !entry.isDirectory && this.isImageFile(entry.name))
        .sort((a, b) => a.name.localeCompare(b.name));

      if (pageIndex < 0 || pageIndex >= imageFiles.length) {
        throw new Error(`Page index ${pageIndex} out of range (0-${imageFiles.length - 1})`);
      }

      const pageEntry = imageFiles[pageIndex];
      const pageData = await zip.entryData(pageEntry);
      
      // Generate output filename
      const baseName = path.basename(filePath, path.extname(filePath));
      const pageExt = path.extname(pageEntry.name);
      const outputPath = path.join(outputDir, `${baseName}_page_${pageIndex + 1}${pageExt}`);
      
      // Ensure output directory exists
      await fs.mkdir(outputDir, { recursive: true });
      
      // Save the page
      await fs.writeFile(outputPath, pageData);
      
      return outputPath;
    } finally {
      await zip.close();
    }
  }
}

module.exports = ComicFileHandler;