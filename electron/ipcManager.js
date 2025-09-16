const { ipcMain, dialog, app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { pathToFileURL } = require('url');
const https = require('https');
const sharp = require('sharp');
let Store = require('electron-store');

if (Store && Store.default) {
  Store = Store.default;
}

const cancellableOperations = new Map();

const apiUsageStore = new Store({ name: 'api-usage' });
const API_HOURLY_LIMIT = 200;

function registerIpcHandlers(mainWindow, { fileHandler, database, knowledgeBasePath, publicCoversDir }) {
  console.log('[IPCManager] Registering IPC handlers...');

  ipcMain.handle('get-app-version', () => app.getVersion());

  ipcMain.handle('init-database', async () => {
    try {
      if (!database) throw new Error('Database service not available');
      await database.initialize();
      return { success: true };
    } catch (err) {
      console.error('[IPC] init-database error:', err);
      throw err;
    }
  });

  ipcMain.handle('app:get-covers-dir', async () => {
    try {
      return publicCoversDir || '';
    } catch (err) {
      console.error('[IPC] app:get-covers-dir error:', err);
      return '';
    }
  });

  ipcMain.handle('app:migrate-covers', async () => {
    const report = { total: 0, updated: 0, skipped: 0, failed: 0, updatedIds: [], failedIds: [] };

    if (!database) throw new Error('Database service not available');
    if (!publicCoversDir || typeof publicCoversDir !== 'string') {
      throw new Error(`Covers directory is invalid or not set: ${publicCoversDir}. Please reinstall the application or report this issue.`);
    }

    try {
      const allComics = await database.getComics();
      report.total = Array.isArray(allComics) ? allComics.length : 0;

      for (const comic of allComics) {
        try {
          const original = comic.coverUrl || '';
          let resolved = null;

          if (original && typeof original === 'string' && original.startsWith('file://')) {
            resolved = original;
          } else {
            const basename = (() => {
              try {
                if (/^data:|^https?:\/\//i.test(original)) return original;
                const lastFileIdx = String(original).lastIndexOf('file:');
                let candidate = String(original);
                if (lastFileIdx > -1) candidate = candidate.slice(lastFileIdx).replace(/^file:\/+/, '');
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
            const placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiMzMzMiPk5vIENvdmVyPC90ZXh0PjxyZWN0IHg9IjEwIiB5PSIxMCIgd2lkdGg9IjM4MCIgaGVpZ2h0PSI1ODAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+';
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
        webPreferences: { plugins: true }
      });
      await pdfWindow.loadFile(filePath);
      return { success: true };
    } catch (error) {
      console.error('Failed to open PDF window:', error);
      return { success: false, error: error.message };
    }
  });

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
              copy.coverUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiMzMzMiPk5vIENvdmVyPC90ZXh0PjxyZWN0IHg9IjEwIiB5PSIxMCIgd2lkdGg9IjM4MCIgaGVpZ2h0PSI1ODAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+';
            }
          } else {
            copy.coverUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiMzMzMiPk5vIENvdmVyPC90ZXh0PjxyZWN0IHg9IjEwIiB5PSIxMCIgd2lkdGg9IjM4MCIgaGVpZ2h0PSI1ODAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+';
          }
        } catch (e) {
          console.error('Error normalizing coverUrl for comic:', copy.id, e);
          copy.coverUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIHRleHQtYW5jaGorPSJtaWRkbGUiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiMzMzMiPk5vIENvdmVyPC90ZXh0PjxyZWN0IHg9IjEwIiB5PSIxMCIgd2lkdGg9IjM4MCIgaGVpZ2h0PSI1ODAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+';
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
  
  ipcMain.handle('delete-comic', async (event, id, filePath) => {
    if (filePath) {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.error(`Failed to delete file: ${filePath}`, error);
      }
    }
    return database.deleteComic(id);
  });

  ipcMain.handle('save-comic', async (event, comic) => {
    try {
      if (!comic.id) throw new Error("Comic must have an ID to be saved.");
      
      comic.coverUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiMzMzMiPk5vIENvdmVyPC90ZXh0PjxyZWN0IHg9IjEwIiB5PSIxMCIgd2lkdGg9IjM4MCIgaGVpZ2h0PSI1ODAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+';
      
      if (comic.filePath) {
        try {
          if (!publicCoversDir || typeof publicCoversDir !== 'string') {
            throw new Error(`Covers directory is invalid or not set: ${publicCoversDir}. Cannot save comic cover.`);
          }
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

  // Unified: extract cover for any supported format; returns a string path
  ipcMain.handle('extract-cover', async (event, filePath) => {
    try {
      if (!publicCoversDir || typeof publicCoversDir !== 'string') {
        throw new Error(`Covers directory is invalid or not set: ${publicCoversDir}. Please reinstall the application or report this issue.`);
      }
      await fs.mkdir(publicCoversDir, { recursive: true });

      // Delegate to fileHandler (which already uses the stable prepare flow for CBR)
      const absoluteCoverPath = await fileHandler.extractCoverToPublic(filePath, publicCoversDir);
      return absoluteCoverPath; // return string for compatibility
    } catch (error) {
      console.error(`[IPC] extract-cover handler error for ${filePath}:`, error);
      throw error; // let renderer catch and show a toast
    }
  });

  console.log('[IPCManager] All IPC handlers registered.');
}

module.exports = { registerIpcHandlers };