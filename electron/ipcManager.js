const { ipcMain, dialog, app } = require('electron');
const path = require('path');
const fs = require('fs').promises;

function registerIpcHandlers(mainWindow, { fileHandler, database, knowledgeBasePath, publicCoversDir }) {
  // App info
  ipcMain.handle('get-app-version', () => app.getVersion());

  // Dialogs
  ipcMain.handle('show-message-box', async (event, options) => {
    return await dialog.showMessageBox(mainWindow, options);
  });

  ipcMain.handle('dialog:select-files', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Comic Files',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Comic Files', extensions: ['cbr', 'cbz', 'pdf'] },
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

  ipcMain.handle('extract-cover', async (event, filePath) => {
    try {
      const tempCoversDir = path.join(app.getPath('userData'), 'temp-covers');
      await fs.mkdir(tempCoversDir, { recursive: true });
      const tempCoverPath = await fileHandler.extractCover(filePath, tempCoversDir);
      
      const comicId = `comic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const publicCoverFilename = `${comicId}-cover.jpg`;
      const publicCoverPath = path.join(publicCoversDir, publicCoverFilename);
      
      await fs.copyFile(tempCoverPath, publicCoverPath);
      await fs.unlink(tempCoverPath);
      
      return `/covers/${publicCoverFilename}`;
    } catch (error) {
      console.error('[EXTRACT-COVER] Error:', error);
      throw error;
    }
  });

  ipcMain.handle('organize-file', async (event, sourcePath, relativeTargetPath) => {
    try {
      const settings = database.getAllSettings();
      // Use the user's library path if set, otherwise use default
      const libraryRoot = settings.libraryPath || path.join(app.getPath('documents'), 'Comic Organizer Library');
      const keepOriginal = settings.keepOriginalFiles !== false;
      const fullTargetPath = path.join(libraryRoot, relativeTargetPath);
      
      console.log('[ORGANIZE-FILE] Source:', sourcePath);
      console.log('[ORGANIZE-FILE] Target:', fullTargetPath);
      console.log('[ORGANIZE-FILE] Library root:', libraryRoot);
      
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
  ipcMain.handle('init-database', () => true);
  ipcMain.handle('get-comics', () => database.getComics());
  ipcMain.handle('update-comic', (event, comic) => database.updateComic(comic));
  
  ipcMain.handle('delete-comic', async (event, comicId, filePath) => {
    if (filePath) {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.error(`Failed to delete file: ${filePath}`, error);
        // We can decide whether to stop or continue. Let's continue and just remove from DB.
        // throw new Error(`Failed to delete file: ${error.message}`);
      }
    }
    return database.deleteComic(comicId);
  });

  ipcMain.handle('save-comic', async (event, comic) => {
    if (!comic.id) {
      comic.id = `comic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    comic.coverUrl = '/placeholder.svg';
    if (comic.filePath) {
      try {
        comic.coverUrl = await fileHandler.extractCoverToPublic(comic.filePath, publicCoversDir);
      } catch (error) {
        console.error(`Could not extract cover for ${comic.filePath}:`, error.message);
      }
    }
    return database.saveComic(comic);
  });

  // Settings operations
  ipcMain.handle('get-settings', () => {
    const settings = database.getAllSettings();
    // Set default library path if not set
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

  // Knowledge Base operations
  ipcMain.handle('get-knowledge-base', async () => {
    const data = await fs.readFile(knowledgeBasePath, 'utf-8');
    return JSON.parse(data);
  });

  ipcMain.handle('save-knowledge-base', async (event, data) => {
    await fs.writeFile(knowledgeBasePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  });
}

module.exports = { registerIpcHandlers };