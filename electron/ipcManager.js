const { ipcMain, dialog, app } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const Database = require('better-sqlite3');

let gcdDb = null;

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
  ipcMain.handle('db:import-comics', (event, comics) => database.importComics(comics));
  
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

  // Knowledge Base operations (Now deprecated, but kept for safety during transition)
  ipcMain.handle('get-knowledge-base', async () => {
    try {
      const data = await fs.readFile(knowledgeBasePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return []; // Return empty if file doesn't exist
    }
  });

  ipcMain.handle('save-knowledge-base', async (event, data) => {
    try {
      await fs.writeFile(knowledgeBasePath, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch {
      return false;
    }
  });

  // GCD Database operations
  ipcMain.handle('gcd-db:connect', (event, dbPath) => {
    try {
      if (gcdDb) {
        gcdDb.close();
      }
      gcdDb = new Database(dbPath, { readonly: true, fileMustExist: true });
      console.log('Successfully connected to GCD database at:', dbPath);
      return true;
    } catch (error) {
      console.error('Failed to connect to GCD database:', error);
      gcdDb = null;
      return false;
    }
  });

  ipcMain.handle('gcd-db:disconnect', () => {
    if (gcdDb) {
      gcdDb.close();
      gcdDb = null;
    }
  });

  ipcMain.handle('gcd-db:search-series', (event, seriesName) => {
    if (!gcdDb) return [];
    try {
      const stmt = gcdDb.prepare(`
        SELECT s.id, s.name, p.name as publisher, s.year_began
        FROM gcd_series s
        JOIN gcd_publisher p ON s.publisher_id = p.id
        WHERE s.name LIKE ?
        LIMIT 20
      `);
      return stmt.all(`%${seriesName}%`);
    } catch (error) {
      console.error('GCD series search failed:', error);
      return [];
    }
  });

  ipcMain.handle('gcd-db:get-issue-details', (event, seriesId, issueNumber) => {
    if (!gcdDb) return null;
    try {
      const normalizedIssue = String(parseInt(issueNumber, 10));
      const stmt = gcdDb.prepare(`
        SELECT id, title, publication_date, notes
        FROM gcd_issue
        WHERE series_id = ? AND number = ?
      `);
      return stmt.get(seriesId, normalizedIssue);
    } catch (error) {
      console.error('GCD issue details search failed:', error);
      return null;
    }
  });

  ipcMain.handle('gcd-db:get-issue-creators', (event, issueId) => {
    if (!gcdDb) return [];
    try {
      const stmt = gcdDb.prepare(`
        SELECT
          ic.credited_as as name,
          ct.name as role
        FROM gcd_issue_credit AS ic
        JOIN gcd_credit_type AS ct ON ic.credit_type_id = ct.id
        WHERE ic.issue_id = ?
        ORDER BY ct.sort_code
      `);
      return stmt.all(issueId);
    } catch (error) {
      console.error('GCD issue creators search failed:', error);
      return [];
    }
  });

  ipcMain.handle('gcd-db:search-publishers', (event, query) => {
    if (!gcdDb) return [];
    try {
      const stmt = gcdDb.prepare(`
        SELECT name FROM gcd_publisher WHERE name LIKE ? ORDER BY name LIMIT 20
      `);
      return stmt.all(`%${query}%`).map(p => p.name);
    } catch (error) {
      console.error('GCD publisher search failed:', error);
      return [];
    }
  });

  // Backup and Restore Dialogs
  ipcMain.handle('dialog:save-backup', async (event, data) => {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Library Backup',
      defaultPath: `comic-library-backup-${new Date().toISOString().split('T')[0]}.json`,
      filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });

    if (canceled || !filePath) {
      return { success: false, path: null };
    }

    try {
      await fs.writeFile(filePath, data, 'utf-8');
      return { success: true, path: filePath };
    } catch (error) {
      console.error('Failed to save backup:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('dialog:load-backup', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Import Library Backup',
      properties: ['openFile'],
      filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });

    if (canceled || filePaths.length === 0) {
      return { success: false, data: null };
    }

    try {
      const filePath = filePaths[0];
      const data = await fs.readFile(filePath, 'utf-8');
      return { success: true, data };
    } catch (error) {
      console.error('Failed to load backup:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerIpcHandlers };