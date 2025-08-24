const { ipcMain, dialog, app } = require('electron');
const path = require('path');
const fs = require('fs');
const fsPromises = fs.promises;
const { pathToFileURL } = require('url');

function registerIpcHandlers(mainWindow, { fileHandler, database, knowledgeBasePath, publicCoversDir }) {
  // App info
  ipcMain.handle('get-app-version', () => app.getVersion());

  // Provide a handler so renderer can initialize DB on demand
  ipcMain.handle('init-database', async () => {
    try {
      if (!database) {
        throw new Error('Database service not available');
      }
      await database.initialize();
      return { success: true };
    } catch (err) {
      console.error('[IPC] init-database error:', err);
      throw err;
    }
  });

  // Dialogs
  ipcMain.handle('show-message-box', async (event, options) => {
    return await dialog.showMessageBox(mainWindow, options);
  });

  ipcMain.handle('dialog:select-files', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Comic Files',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Comic Files', extensions: ['cbr', 'cbz', 'pdf', 'tsv', 'sqlite'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    return canceled ? [] : filePaths;
  });

  ipcMain.handle('dialog:select-folder', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Folder',
      properties: ['openDirectory']
    });
    return canceled ? [] : filePaths;
  });

  // File system operations
  ipcMain.handle('read-comic-file', (event, filePath) => fileHandler.readComicFile(filePath));
  ipcMain.handle('scan-folder', (event, folderPath) => fileHandler.scanFolder(folderPath));

  // FIXED: Extract cover with proper path handling and existence verification
  ipcMain.handle('extract-cover', async (event, filePath) => {
    try {
      console.log('[IPC] extract-cover called for:', filePath);
      
      // Ensure covers directory exists
      await fsPromises.mkdir(publicCoversDir, { recursive: true });
      console.log('[IPC] Covers directory ensured:', publicCoversDir);

      // Extract cover and get the absolute path
      const absoluteCoverPath = await fileHandler.extractCoverToPublic(filePath, publicCoversDir);
      console.log('[IPC] Cover extracted to absolute path:', absoluteCoverPath);
      
      // Verify the file actually exists before returning success
      try {
        await fsPromises.access(absoluteCoverPath);
        console.log('[IPC] Cover file existence verified');
      } catch (accessError) {
        console.error('[IPC] Cover file does not exist after extraction:', absoluteCoverPath);
        throw new Error(`Cover extraction failed - file not found: ${absoluteCoverPath}`);
      }
      
      // Convert to proper file URL using Node.js pathToFileURL
      const fileUrl = pathToFileURL(absoluteCoverPath).href;
      console.log('[IPC] Final file URL:', fileUrl);
      
      return fileUrl;
    } catch (error) {
      console.error('[IPC] Error in extract-cover handler:', error);
      throw error;
    }
  });

  ipcMain.handle('organize-file', async (event, sourcePath, relativeTargetPath) => {
    try {
      const settings = database.getAllSettings();
      const libraryRoot = settings.libraryPath || path.join(app.getPath('documents'), 'Comic Organizer Library');
      const keepOriginal = settings.keepOriginalFiles !== false;
      const fullTargetPath = path.join(libraryRoot, relativeTargetPath);
      
      const success = await fileHandler.organizeFile(sourcePath, fullTargetPath, keepOriginal);
      return success ? { success: true, newPath: fullTargetPath } : { success: false, error: 'File operation failed.' };
    } catch (error) {
      console.error('Organize file error:', error);
      throw error;
    }
  });

  // Comic Reader operations
  ipcMain.handle('get-comic-pages', (event, filePath) => fileHandler.getPages(filePath));
  ipcMain.handle('get-comic-page-data-url', (event, filePath, pageName) => fileHandler.extractPageAsDataUrl(filePath, pageName));
  ipcMain.handle('reader:prepare-cbr', (event, filePath) => fileHandler.prepareCbrForReading(filePath));
  ipcMain.handle('reader:get-page-from-temp', (event, tempDir, pageName) => fileHandler.getPageDataUrlFromTemp(tempDir, pageName));
  ipcMain.handle('reader:cleanup-temp-dir', (event, tempDir) => fileHandler.cleanupTempDir(tempDir));

  // Database operations
  // FIXED: Normalize cover URLs and provide fallback for missing placeholder
  ipcMain.handle('get-comics', async () => {
    try {
      const comics = await database.getComics();

      const normalized = comics.map((c) => {
        const copy = { ...c };
        try {
          if (copy.coverUrl && typeof copy.coverUrl === 'string') {
            const url = copy.coverUrl;

            // Handle different URL formats
            if (url.startsWith('file:')) {
              // Already a file URL - ensure it's properly formatted
              copy.coverUrl = url;
            } else if (url.startsWith('/covers/') || url.startsWith('covers/')) {
              // Relative path - convert to absolute file URL
              const filename = path.basename(url);
              const absolutePath = path.join(publicCoversDir, filename);
              copy.coverUrl = pathToFileURL(absolutePath).href;
            } else if (path.isAbsolute(url)) {
              // Absolute path - convert to file URL
              copy.coverUrl = pathToFileURL(url).href;
            } else if (url === '/placeholder.svg' || url.includes('placeholder')) {
              // FIXED: Use a data URL for placeholder instead of file path
              copy.coverUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzMzMyI+CiAgICBObyBDb3ZlcgogIDwvdGV4dD4KICA8cmVjdCB4PSIxMCIgeT0iMTAiIHdpZHRoPSIzODAiIGhlaWdodD0iNTgwIiBmaWxsPSJub25lIiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMiIvPgo8L3N2Zz4K';
            }
          } else {
            // No cover URL - use placeholder
            copy.coverUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzMzMyI+CiAgICBObyBDb3ZlcgogIDwvdGV4dD4KICA8cmVjdCB4PSIxMCIgeT0iMTAiIHdpZHRoPSIzODAiIGhlaWdodD0iNTgwIiBmaWxsPSJub25lIiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMiIvPgo8L3N2Zz4K';
          }
        } catch (e) {
          console.error('Error normalizing coverUrl for comic:', copy.id, e);
          // Fallback to placeholder on error
          copy.coverUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzMzMyI+CiAgICBObyBDb3ZlcgogIDwvdGV4dD4KICA8cmVjdCB4PSIxMCIgeT0iMTAiIHdpZHRoPSIzODAiIGhlaWdodD0iNTgwIiBmaWxsPSJub25lIiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMiIvPgo8L3N2Zz4K';
        }
        return copy;
      });

      return normalized;
    } catch (err) {
      console.error('Error in get-comics handler:', err);
      return [];
    }
  });

  ipcMain.handle('update-comic', (event, comic) => database.updateComic(comic));
  ipcMain.handle('db:import-comics', (event, comics) => database.importComics(comics));
  
  ipcMain.handle('delete-comic', async (event, comicId, filePath) => {
    if (filePath) {
      try {
        await fsPromises.unlink(filePath);
      } catch (error) {
        console.error(`Failed to delete file: ${filePath}`, error);
      }
    }
    return database.deleteComic(comicId);
  });

  // FIXED: Save comic with proper cover extraction and path verification
  ipcMain.handle('save-comic', async (event, comic) => {
    try {
      if (!comic.id) {
        comic.id = `comic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      
      // Default to placeholder
      comic.coverUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzMzMyI+CiAgICBObyBDb3ZlcgogIDwvdGV4dD4KICA8cmVjdCB4PSIxMCIgeT0iMTAiIHdpZHRoPSIzODAiIGhlaWdodD0iNTgwIiBmaWxsPSJub25lIiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMiIvPgo8L3N2Zz4K';
      
      if (comic.filePath) {
        try {
          console.log('[IPC] save-comic: Extracting cover for:', comic.filePath);
          
          // Ensure covers directory exists
          await fsPromises.mkdir(publicCoversDir, { recursive: true });
          
          // Extract cover and get absolute path
          const absoluteCoverPath = await fileHandler.extractCoverToPublic(comic.filePath, publicCoversDir);
          console.log('[IPC] save-comic: Cover extracted to:', absoluteCoverPath);
          
          // Verify file exists before setting URL
          try {
            await fsPromises.access(absoluteCoverPath);
            comic.coverUrl = pathToFileURL(absoluteCoverPath).href;
            console.log('[IPC] save-comic: Cover URL set to:', comic.coverUrl);
          } catch (accessError) {
            console.warn('[IPC] save-comic: Cover file not accessible, using placeholder:', accessError.message);
            // Keep placeholder URL
          }
        } catch (error) {
          console.error(`[IPC] save-comic: Could not extract cover for ${comic.filePath}:`, error.message);
          // Keep placeholder URL
        }
      }
      
      return database.saveComic(comic);
    } catch (error) {
      console.error('[IPC] Error in save-comic handler:', error);
      throw error;
    }
  });

  // Settings operations
  ipcMain.handle('get-settings', () => {
    const settings = database.getAllSettings();
    if (!settings.libraryPath) {
      settings.libraryPath = path.join(app.getPath('documents'), 'Comic Organizer Library');
    }
    return settings;
  });
  
  ipcMain.handle('save-settings', (event, settings) => {
    for (const [key, value] of Object.entries(settings)) {
      database.saveSetting(key, value);
    }
    return true;
  });

  // Knowledge Base handlers
  ipcMain.handle('get-knowledge-base', async () => {
    try {
      const data = await fsPromises.readFile(knowledgeBasePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to read knowledge base:', error);
      return [];
    }
  });

  ipcMain.handle('save-knowledge-base', async (event, data) => {
    try {
      await fsPromises.writeFile(knowledgeBasePath, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (error) {
      console.error('Failed to save knowledge base:', error);
      return false;
    }
  });

  // GCD Importer - Temporarily Disabled
  ipcMain.handle('importer:start', async () => {
    console.warn('GCD Importer is temporarily disabled due to build issues.');
    return { success: false, message: 'This feature is temporarily disabled.' };
  });

  // GCD Database operations - Temporarily Disabled
  ipcMain.handle('gcd-db:connect', () => {
    console.warn('GCD DB Connect is temporarily disabled.');
    return false;
  });
  ipcMain.handle('gcd-db:search-series', () => {
    console.warn('GCD DB Search is temporarily disabled.');
    return [];
  });
  ipcMain.handle('gcd-db:get-issue-details', () => {
    console.warn('GCD DB Get Issue Details is temporarily disabled.');
    return null;
  });
  ipcMain.handle('gcd-db:get-issue-creators', () => {
    console.warn('GCD DB Get Issue Creators is temporarily disabled.');
    return [];
  });

  // Backup and Restore Dialogs
  ipcMain.handle('dialog:save-backup', async (event, data) => {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Library Backup',
      defaultPath: `comic-library-backup-${new Date().toISOString().split('T')[0]}.json`,
      filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });
    if (canceled || !filePath) return { success: false, path: null };
    try {
      await fsPromises.writeFile(filePath, data, 'utf-8');
      return { success: true, path: filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('dialog:load-backup', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Import Library Backup',
      properties: ['openFile'],
      filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });
    if (canceled || filePaths.length === 0) return { success: false, data: null };
    try {
      const data = await fsPromises.readFile(filePaths[0], 'utf-8');
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerIpcHandlers };