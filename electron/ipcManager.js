const { ipcMain, dialog, app } = require('electron');
const path = require('path');
const fs = require('fs');
const fsPromises = fs.promises;
const readline = require('readline');

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
      // Let the renderer receive the error (invoke will reject)
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

  // Extract cover and return a file:// URL pointing to the copied cover in publicCoversDir
  ipcMain.handle('extract-cover', async (event, filePath) => {
    try {
      // Ensure public covers dir exists
      await fsPromises.mkdir(publicCoversDir, { recursive: true });

      // Use fileHandler.extractCoverToPublic to get absolute path to stored cover
      const absoluteCoverPath = await fileHandler.extractCoverToPublic(filePath, publicCoversDir);

      // Normalize to forward-slash path and produce a proper file:/// URL
      const normalized = path.resolve(absoluteCoverPath).replace(/\\/g, '/');
      const fileUrl = 'file:///' + encodeURI(normalized);
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
  // Normalize cover URLs before returning comics so renderer always gets a file:/// absolute URL if possible
  ipcMain.handle('get-comics', async () => {
    try {
      const comics = await database.getComics();

      const normalized = comics.map((c) => {
        const copy = { ...c };
        try {
          if (copy.coverUrl && typeof copy.coverUrl === 'string') {
            const url = copy.coverUrl;

            // If already a file:// URL, ensure it uses forward slashes and is encoded
            if (url.startsWith('file:')) {
              // Strip file:// and re-normalize
              let withoutScheme = url.replace(/^file:\/+/, '');
              withoutScheme = withoutScheme.replace(/\\/g, '/');
              copy.coverUrl = 'file:///' + encodeURI(withoutScheme);
            } else if (url.startsWith('/covers/') || url.startsWith('covers/')) {
              // If stored as a public-relative path, map it to actual publicCoversDir location
              const filename = path.basename(url);
              const abs = path.join(publicCoversDir, filename);
              const normalizedPath = path.resolve(abs).replace(/\\/g, '/');
              copy.coverUrl = 'file:///' + encodeURI(normalizedPath);
            } else if (/^[a-zA-Z]:[\\/]/.test(url)) {
              // Windows absolute path without scheme (e.g., C:\covers\...)
              const normalizedPath = path.resolve(url).replace(/\\/g, '/');
              copy.coverUrl = 'file:///' + encodeURI(normalizedPath);
            } else {
              // For anything else (e.g., '/placeholder.svg' or relative), leave as-is
            }
          }
        } catch (e) {
          console.error('Error normalizing coverUrl for comic:', copy.id, e);
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

  ipcMain.handle('save-comic', async (event, comic) => {
    try {
      if (!comic.id) {
        comic.id = `comic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      comic.coverUrl = '/placeholder.svg';
      if (comic.filePath) {
        try {
          // Use fileHandler.extractCoverToPublic to get the absolute path then convert to file:///
          const absoluteCoverPath = await fileHandler.extractCoverToPublic(comic.filePath, publicCoversDir);
          const normalized = path.resolve(absoluteCoverPath).replace(/\\/g, '/');
          comic.coverUrl = 'file:///' + encodeURI(normalized);
        } catch (error) {
          console.error(`Could not extract cover for ${comic.filePath}:`, error && error.message);
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