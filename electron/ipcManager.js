const { ipcMain, dialog, app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { pathToFileURL } = require('url');
const https = require('https');
let Store = require('electron-store');

// Handle cases where the module is wrapped in a default export
if (Store && Store.default) {
  Store = Store.default;
}

// Map to store AbortController instances for cancellable operations
const cancellableOperations = new Map();

// Initialize API usage store
const apiUsageStore = new Store({ name: 'api-usage' });
const API_HOURLY_LIMIT = 200; // Comic Vine API limit

function registerIpcHandlers(mainWindow, { fileHandler, database, knowledgeBasePath, publicCoversDir }) {
  console.log('[IPCManager] Registering IPC handlers...');

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

  // Expose canonical covers directory to renderer
  ipcMain.handle('app:get-covers-dir', async () => {
    try {
      // Return the absolute path where the app stores cover images
      return publicCoversDir || '';
    } catch (err) {
      console.error('[IPC] app:get-covers-dir error:', err);
      return '';
    }
  });

  // One-time migration: canonicalize cover paths for all comics
  ipcMain.handle('app:migrate-covers', async () => {
    const report = {
      total: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      updatedIds: [],
      failedIds: []
    };

    if (!database) {
      throw new Error('Database service not available');
    }

    try {
      const allComics = await database.getComics();
      report.total = Array.isArray(allComics) ? allComics.length : 0;

      for (const comic of allComics) {
        try {
          const original = comic.coverUrl || '';
          let resolved = null;

          // If already a file:// URL, normalize and skip
          if (original && typeof original === 'string' && original.startsWith('file://')) {
            resolved = original;
          } else {
            const basename = (() => {
              try {
                if (/^data:|^https?:\/\//i.test(original)) return original;
                const lastFileIdx = String(original).lastIndexOf('file:');
                let candidate = String(original);
                if (lastFileIdx > -1) {
                  candidate = candidate.slice(lastFileIdx).replace(/^file:\/+/, '');
                }
                return path.basename(candidate);
              } catch {
                return path.basename(String(original || ''));
              }
            })();

            if (basename) {
              const candidatePath = path.join(publicCoversDir || '', basename);
              try {
                await fs.access(candidatePath);
                resolved = pathToFileURL(candidatePath).href;
              } catch {
                try {
                  if (path.isAbsolute(original)) {
                    const abs = original;
                    try {
                      await fs.access(abs);
                      resolved = pathToFileURL(abs).href;
                    } catch {}
                  }
                } catch {}
              }
            }
          }

          if (resolved) {
            if (comic.coverUrl !== resolved) {
              comic.coverUrl = resolved;
              await database.updateComic({ ...comic });
              report.updated++;
              report.updatedIds.push(comic.id);
            } else {
              report.skipped++;
            }
          } else {
            const placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCI yeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnL3N2ZyI+CiAgPHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2YwZjBmMCIvPgogIDx0ZXh0IHg9IjUwJSI yeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiMzMzMiPgogICAgTm8gQ292ZXIKICA8L3RleHQ+CiAgPHJlY3Q yeD0iMTAiIHk9IjEwIiB3aWR0aD0iMzgwIiBoZWlnaHQ9IjU4MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMzMzIiBzdHJva2Utd2lkdGg9IjIiLz4KPC9zZ3Y+Cg==';
            if (comic.coverUrl !== placeholder) {
              comic.coverUrl = placeholder;
              await database.updateComic({ ...comic });
              report.updated++;
              report.updatedIds.push(comic.id);
            } else {
              report.skipped++;
            }
          }
        } catch (err) {
          console.error('[IPC][migrate-covers] Failed for comic id:', comic.id, err);
          report.failed++;
          report.failedIds.push(comic.id);
        }
      }

      return report;
    } catch (err) {
      console.error('[IPC] app:migrate-covers error:', err);
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
  ipcMain.handle('read-comic-file', async (event, filePath, operationId) => {
    const controller = new AbortController();
    cancellableOperations.set(operationId, controller);
    try {
      const result = await fileHandler.readComicFile(filePath, controller.signal);
      return result;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`Operation ${operationId} aborted: read-comic-file`);
        throw error;
      }
      console.error(`Error in read-comic-file for ${filePath}:`, error);
      throw error;
    } finally {
      cancellableOperations.delete(operationId);
    }
  });

  ipcMain.handle('scan-folder', async (event, folderPath, operationId) => {
    const controller = new AbortController();
    cancellableOperations.set(operationId, controller);
    try {
      const result = await fileHandler.scanFolder(folderPath, controller.signal);
      return result;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`Operation ${operationId} aborted: scan-folder`);
        throw error;
      }
      console.error(`Error in scan-folder for ${folderPath}:`, error);
      throw error;
    } finally {
      cancellableOperations.delete(operationId);
    }
  });

  ipcMain.handle('cancel-file-loading', async () => {
    cancellableOperations.forEach(controller => controller.abort());
    cancellableOperations.clear();
    console.log('All ongoing file loading operations cancelled.');
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

  ipcMain.handle('move-file', async (event, sourcePath, relativeTargetPath) => {
    try {
      const settings = database.getAllSettings();
      const libraryRoot = settings.libraryPath || path.join(app.getPath('documents'), 'Comic Organizer Library');
      const fullTargetPath = path.join(libraryRoot, relativeTargetPath);

      if (sourcePath === fullTargetPath) {
        return { success: true, newPath: fullTargetPath };
      }

      await fileHandler.moveFile(sourcePath, fullTargetPath);
      return { success: true, newPath: fullTargetPath };
    } catch (error) {
      console.error('Move file error:', error);
      return { success: false, error: error.message };
    }
  });

  // Comic Reader operations
  ipcMain.handle('get-comic-pages', (event, filePath) => fileHandler.getPages(filePath));
  ipcMain.handle('get-comic-page-data-url', (event, filePath, pageName) => fileHandler.extractPageAsDataUrl(filePath, pageName));
  ipcMain.handle('reader:prepare-cbr', (event, filePath) => fileHandler.prepareCbrForReading(filePath));
  ipcMain.handle('reader:get-page-from-temp', (event, tempDir, pageName) => fileHandler.getPageDataUrlFromTemp(tempDir, pageName));
  ipcMain.handle('reader:cleanup-temp-dir', (event, tempDir) => fileHandler.cleanupTempDir(tempDir));
  ipcMain.handle('reader:open-pdf', async (event, filePath) => {
    try {
      const pdfWindow = new BrowserWindow({
        width: 1024,
        height: 768,
        parent: mainWindow,
        modal: false,
        autoHideMenuBar: true,
        title: path.basename(filePath),
        webPreferences: {
          plugins: true,
        }
      });
      
      await pdfWindow.loadFile(filePath);
      
      return { success: true };
    } catch (error) {
      console.error('Failed to open PDF window:', error);
      return { success: false, error: error.message };
    }
  });

  // Database operations
  ipcMain.handle('get-comics', async () => {
    try {
      const comics = await database.getComics();

      const normalized = comics.map((c) => {
        const copy = { ...c };
        try {
          if (copy.coverUrl && typeof copy.coverUrl === 'string') {
            const url = copy.coverUrl;

            if (url.startsWith('file:')) {
              copy.coverUrl = url;
            } else if (url.startsWith('/covers/') || url.startsWith('covers/')) {
              const filename = path.basename(url);
              const absolutePath = path.join(publicCoversDir, filename);
              copy.coverUrl = pathToFileURL(absolutePath).href;
            } else if (path.isAbsolute(url)) {
              copy.coverUrl = pathToFileURL(url).href;
            } else if (url === '/placeholder.svg' || url.includes('placeholder')) {
              copy.coverUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCI yeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+CiAgPHRleHQ yeD0iNTAlIiB5PSI1MCUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD09IiMzMzMiPgogICAgTm8gQ292ZXIKICA8L3RleHQ+CiAgPHJlY3Q yeD0iMTAiIHk9IjEwIiB3aWR0aD0iMzgwIiBoZWlnaHQ9IjU4MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMzMzIiBzdHJva2Utd2lkdGg9IjIiLz4KPC9zZ3Y+Cg==';
            }
          } else {
            copy.coverUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCI yeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnL3N2ZyI+CiAgPHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2YwZjBmMCIvPgogIDx0ZXh0IHg9IjUwJSI yeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiMzMzMiPgogICAgTm8gQ292ZXIKICA8L3RleHQ+CiAgPHJlY3Q yeD0iMTAiIHk9IjEwIiB3aWR0aD0iMzgwIiBoZWlnaHQ9IjU4MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMzMzIiBzdHJva2Utd2lkdGg9IjIiLz4KPC9zZ3Y+Cg==';
          }
        } catch (e) {
          console.error('Error normalizing coverUrl for comic:', copy.id, e);
          copy.coverUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCI yeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnL3N2ZyI+CiAgPHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2YwZjBmMCIvPgogIDx0ZXh0IHg9IjUwJSI yeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiMzMzMiPgogICAgTm8gQ292ZXIKICA8L3RleHQ+CiAgPHJlY3Q yeD0iMTAiIHk9IjEwIiB3aWR0aD0iMzgwIiBoZWlnaHQ9IjU4MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMzMzIiBzdHJva2Utd2lkdGg9IjIiLz4KPC9zZ3Y+Cg==';
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
  ipcMain.handle('db:batch-update-comics', (event, updates) => database.batchUpdateComics(updates));
  
  ipcMain.handle('delete-comic', async (event, comicId, filePath) => {
    if (filePath) {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.error(`Failed to delete file: ${filePath}`, error);
      }
    }
    return database.deleteComic(comicId);
  });

  ipcMain.handle('save-comic', async (event, comic) => {
    try {
      if (!comic.id) {
        throw new Error("Comic must have an ID to be saved.");
      }
      
      comic.coverUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCI yeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnL3N2ZyI+CiAgPHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2YwZjBmMCIvPgogIDx0ZXh0IHg9IjUwJSI yeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiMzMzMiPgogICAgTm8gQ292ZXIKICA8L3RleHQ+CiAgPHJlY3Q yeD0iMTAiIHk9IjEwIiB3aWR0aD0iMzgwIiBoZWlnaHQ9IjU4MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMzMzIiBzdHJva2Utd2lkdGg9IjIiLz4KPC9zZ3Y+Cg==';
      
      if (comic.filePath) {
        try {
          await fs.mkdir(publicCoversDir, { recursive: true });
          const absoluteCoverPath = await fileHandler.extractCoverToPublic(comic.filePath, publicCoversDir);
          
          try {
            await fs.access(absoluteCoverPath);
            comic.coverUrl = pathToFileURL(absoluteCoverPath).href;
          } catch (accessError) {
            console.warn('[IPC] save-comic: Cover file not accessible, using placeholder:', accessError.message);
          }
        } catch (error) {
          console.error(`[IPC] save-comic: Could not extract cover for ${comic.filePath}:`, error.message);
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
    try {
      for (const [key, value] of Object.entries(settings)) {
        database.saveSetting(key, value);
      }
      return true;
    } catch (error) {
      console.error('[IPC] Error in save-settings handler:', error);
      throw error;
    }
  });

  // Knowledge Base handlers
  ipcMain.handle('get-knowledge-base', async () => {
    try {
      const data = await fs.readFile(knowledgeBasePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to read knowledge base:', error);
      return [];
    }
  });

  ipcMain.handle('save-knowledge-base', async (event, data) => {
    try {
      await fs.writeFile(knowledgeBasePath, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (error) {
      console.error('Failed to save knowledge base:', error);
      return false;
    }
  });

  // Comic Vine API Proxy
  ipcMain.handle('comicvine:fetch', async (event, url, options) => {
    console.log('[IPC] comicvine:fetch handler called for URL:', url);

    // --- API Usage Tracking Logic ---
    let currentUsage = apiUsageStore.get('currentUsage', 0);
    let lastReset = apiUsageStore.get('lastReset', Date.now());
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds

    if (Date.now() - lastReset > oneHour) {
      currentUsage = 0;
      lastReset = Date.now();
      apiUsageStore.set('lastReset', lastReset);
    }

    if (currentUsage >= API_HOURLY_LIMIT) {
      console.warn('[IPC][comicvine:fetch] API limit reached. Request blocked.');
      return { success: false, error: 'Comic Vine API hourly limit reached. Please wait.', status: 429 };
    }
    // --- End API Usage Tracking Logic ---

    return new Promise((resolve, reject) => {
      const requestOptions = {
        headers: {
          'User-Agent': `SuperComicOrganizer/${app.getVersion()}`,
          ...(options?.headers || {}),
        },
      };

      https.get(url, requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
              console.error(`[IPC][comicvine:fetch] API request to ${url} failed with status ${res.statusCode}: ${data}`);
              resolve({ success: false, error: `API request failed with status ${res.statusCode}`, status: res.statusCode });
            } else {
              // Increment usage only on successful API response
              currentUsage++;
              apiUsageStore.set('currentUsage', currentUsage);
              apiUsageStore.set('lastReset', lastReset); // Update lastReset to keep the 1-hour window accurate
              resolve({ success: true, data: JSON.parse(data) });
            }
          } catch (error) {
            console.error('[IPC][comicvine:fetch] Error parsing JSON or processing response:', error);
            reject({ success: false, error: `Error processing API response: ${error.message}` });
          }
        });
      }).on('error', (error) => {
        console.error('[IPC][comicvine:fetch] Network or HTTPS error:', error);
        reject({ success: false, error: `Network error: ${error.message}` });
      });
    });
  });

  // New IPC handler to get API usage stats
  ipcMain.handle('get-api-usage', async () => {
    let currentUsage = apiUsageStore.get('currentUsage', 0);
    let lastReset = apiUsageStore.get('lastReset', Date.now());
    const oneHour = 60 * 60 * 1000;

    if (Date.now() - lastReset > oneHour) {
      currentUsage = 0;
      lastReset = Date.now();
      apiUsageStore.set('currentUsage', currentUsage);
      apiUsageStore.set('lastReset', lastReset);
    }

    const timeUntilResetMs = Math.max(0, oneHour - (Date.now() - lastReset));

    return {
      currentUsage,
      hourlyLimit: API_HOURLY_LIMIT,
      timeUntilResetMs,
    };
  });

  // GCD Importer - Temporarily Disabled
  ipcMain.handle('importer:start', async () => {
    console.warn('GCD Importer is temporarily disabled due to user request.');
    return { success: false, message: 'This feature is temporarily disabled.' };
  });

  // GCD Database operations - Temporarily Disabled
  ipcMain.handle('gcd-db:connect', () => {
    console.warn('GCD DB Connect is temporarily disabled due to user request.');
    return false;
  });
  ipcMain.handle('gcd-db:search-series', () => {
    console.warn('GCD DB Search is temporarily disabled due to user request.');
    return [];
  });
  ipcMain.handle('gcd-db:get-issue-details', () => {
    console.warn('GCD DB Get Issue Details is temporarily disabled due to user request.');
    return null;
  });
  ipcMain.handle('gcd-db:get-issue-creators', () => {
    console.warn('GCD DB Get Issue Creators is temporarily disabled due to user request.');
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
      await fs.writeFile(filePath, data, 'utf-8');
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
      const data = await fs.readFile(filePaths[0], 'utf-8');
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('extract-cover', async (event, filePath) => {
    try {
      await fs.mkdir(publicCoversDir, { recursive: true });
      const absoluteCoverPath = await fileHandler.extractCoverToPublic(filePath, publicCoversDir);
      return absoluteCoverPath;
    } catch (error) {
      console.error(`[IPC] extract-cover handler error for ${filePath}:`, error);
      throw error;
    }
  });

  console.log('[IPCManager] All IPC handlers registered.');
}

module.exports = { registerIpcHandlers };