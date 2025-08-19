const { ipcMain, dialog, app } = require('electron');
const path = require('path');
const fs = require('fs');
const readline = require('readline');
const Database = require('better-sqlite3');

let gcdDb = null;

// Helper to parse a TSV line
const parseTsvLine = (line) => {
  return line.split('\t').map(field => {
    // Unescape quotes
    if (field.startsWith('"') && field.endsWith('"')) {
      return field.slice(1, -1).replace(/""/g, '"');
    }
    return field;
  });
};

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

  ipcMain.handle('extract-cover', async (event, filePath) => {
    try {
      const tempCoversDir = path.join(app.getPath('userData'), 'temp-covers');
      await fs.promises.mkdir(tempCoversDir, { recursive: true });
      const tempCoverPath = await fileHandler.extractCover(filePath, tempCoversDir);
      
      const comicId = `comic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const publicCoverFilename = `${comicId}-cover.jpg`;
      const publicCoverPath = path.join(publicCoversDir, publicCoverFilename);
      
      await fs.promises.copyFile(tempCoverPath, publicCoverPath);
      await fs.promises.unlink(tempCoverPath);
      
      return `/covers/${publicCoverFilename}`;
    } catch (error) {
      console.error('[EXTRACT-COVER] Error:', error);
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
  ipcMain.handle('init-database', () => true);
  ipcMain.handle('get-comics', () => database.getComics());
  ipcMain.handle('update-comic', (event, comic) => database.updateComic(comic));
  ipcMain.handle('db:import-comics', (event, comics) => database.importComics(comics));
  
  ipcMain.handle('delete-comic', async (event, comicId, filePath) => {
    if (filePath) {
      try {
        await fs.promises.unlink(filePath);
      } catch (error) {
        console.error(`Failed to delete file: ${filePath}`, error);
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
      const data = await fs.promises.readFile(knowledgeBasePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to read knowledge base:', error);
      return [];
    }
  });

  ipcMain.handle('save-knowledge-base', async (event, data) => {
    try {
      await fs.promises.writeFile(knowledgeBasePath, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (error) {
      console.error('Failed to save knowledge base:', error);
      return false;
    }
  });

  // GCD Importer
  ipcMain.handle('importer:start', async (event, { issuesPath, sequencesPath }) => {
    const dbPath = path.join(app.getPath('userData'), 'gcd_local.sqlite');
    
    try {
      // Close any existing connection before trying to delete the file.
      if (gcdDb) {
        gcdDb.close();
        gcdDb = null;
      }

      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
      }
      
      const localDb = new Database(dbPath);
      
      localDb.exec(`
        CREATE TABLE issue_details (
          issue_id INTEGER,
          key TEXT,
          value TEXT
        );
        CREATE TABLE story_details (
          issue_id INTEGER,
          sequence_number INTEGER,
          key TEXT,
          value TEXT
        );
        CREATE INDEX idx_issue_details_issue_id_key ON issue_details(issue_id, key);
        CREATE INDEX idx_issue_details_key_value ON issue_details(key, value);
        CREATE INDEX idx_story_details_issue_id ON story_details(issue_id);
      `);

      const processFile = (filePath, tableName, isIssuesFile) => new Promise((resolve, reject) => {
        const fileStream = fs.createReadStream(filePath);
        const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
        
        const insertStmt = isIssuesFile
          ? localDb.prepare(`INSERT INTO ${tableName} (issue_id, key, value) VALUES (?, ?, ?)`)
          : localDb.prepare(`INSERT INTO ${tableName} (issue_id, sequence_number, key, value) VALUES (?, ?, ?, ?)`);
        
        const transaction = localDb.transaction((rows) => {
          for (const row of rows) insertStmt.run(row);
        });

        let buffer = [];
        let lineCount = 0;
        
        rl.on('line', (line) => {
          lineCount++;
          const parts = parseTsvLine(line);
          if (isIssuesFile) {
            if (parts.length === 3) buffer.push([parseInt(parts[0]), parts[1], parts[2]]);
          } else {
            if (parts.length === 4) buffer.push([parseInt(parts[0]), parseInt(parts[1]), parts[2], parts[3]]);
          }

          if (buffer.length >= 50000) {
            transaction(buffer);
            buffer = [];
            event.sender.send('importer:progress', { percent: 50, message: `Processing ${path.basename(filePath)}: ${lineCount.toLocaleString()} lines...` });
          }
        });

        rl.on('close', () => {
          if (buffer.length > 0) transaction(buffer);
          resolve(lineCount);
        });
        rl.on('error', reject);
      });

      event.sender.send('importer:progress', { percent: 10, message: 'Processing issues file...' });
      const issueLines = await processFile(issuesPath, 'issue_details', true);
      
      event.sender.send('importer:progress', { percent: 60, message: 'Processing story file...' });
      const sequenceLines = await processFile(sequencesPath, 'story_details', false);

      localDb.close();
      
      gcdDb = new Database(dbPath, { readonly: true, fileMustExist: true });

      database.saveSetting('gcdDbPath', dbPath);
      database.saveSetting('gcdIssuesPath', issuesPath);
      database.saveSetting('gcdSequencesPath', sequencesPath);

      return { success: true, message: `Database built successfully with ${issueLines.toLocaleString()} issue records and ${sequenceLines.toLocaleString()} story records.` };
    } catch (error) {
      console.error('Importer error:', error);
      return { success: false, message: error.message };
    }
  });

  // GCD Database operations
  ipcMain.handle('gcd-db:connect', (event, dbPath) => {
    const localDbPath = dbPath || path.join(app.getPath('userData'), 'gcd_local.sqlite');
    try {
      if (gcdDb) gcdDb.close();
      if (!fs.existsSync(localDbPath)) return false;
      gcdDb = new Database(localDbPath, { readonly: true, fileMustExist: true });
      return true;
    } catch (error) {
      console.error('Failed to connect to GCD database:', error);
      gcdDb = null;
      return false;
    }
  });

  ipcMain.handle('gcd-db:search-series', (event, seriesName) => {
    if (!gcdDb) return [];
    try {
      const stmt = gcdDb.prepare(`
        SELECT
          s.issue_id as id,
          s.value as name,
          (SELECT value FROM issue_details WHERE issue_id = s.issue_id AND key = 'publisher name') as publisher,
          (SELECT SUBSTR(value, 1, 4) FROM issue_details WHERE issue_id = s.issue_id AND key = 'publication date') as year_began
        FROM issue_details s
        WHERE s.key = 'series name' AND s.value LIKE ? COLLATE NOCASE
        GROUP BY s.value, publisher
        ORDER BY CASE WHEN s.value = ? THEN 1 WHEN s.value LIKE ? THEN 2 ELSE 3 END, s.value
        LIMIT 20
      `);
      return stmt.all(`%${seriesName}%`, seriesName, `${seriesName}%`);
    } catch (error) {
      console.error('[GCD-SEARCH] Search failed:', error);
      return [];
    }
  });

  ipcMain.handle('gcd-db:get-issue-details', (event, seriesId, issueNumber) => {
    if (!gcdDb) return null;
    try {
      const seriesNameStmt = gcdDb.prepare(`SELECT value FROM issue_details WHERE issue_id = ? AND key = 'series name'`);
      const seriesNameResult = seriesNameStmt.get(seriesId);
      if (!seriesNameResult) return null;
      const seriesName = seriesNameResult.value;

      const issueIdStmt = gcdDb.prepare(`
        SELECT s.issue_id FROM issue_details s
        JOIN issue_details i ON s.issue_id = i.issue_id
        WHERE s.key = 'series name' AND s.value = ?
          AND i.key = 'issue number' AND i.value = ?
      `);
      const issueIdResult = issueIdStmt.get(seriesName, issueNumber);
      if (!issueIdResult) return null;
      const issueId = issueIdResult.issue_id;

      const detailsStmt = gcdDb.prepare(`SELECT key, value FROM issue_details WHERE issue_id = ?`);
      const details = detailsStmt.all(issueId).reduce((acc, row) => {
        acc[row.key.replace(/\s/g, '_')] = row.value;
        return acc;
      }, { id: issueId });

      return details;
    } catch (error) {
      console.error('GCD issue details search failed:', error);
      return null;
    }
  });

  ipcMain.handle('gcd-db:get-issue-creators', (event, issueId) => {
    if (!gcdDb) return [];
    try {
      const stmt = gcdDb.prepare(`
        SELECT key as role, value as name
        FROM story_details
        WHERE issue_id = ? AND key IN ('script', 'pencils', 'inks', 'colors', 'letters', 'editor', 'writer', 'artist', 'cover-artist')
        GROUP BY key, value
        ORDER BY sequence_number
      `);
      return stmt.all(issueId).map(row => ({
        ...row,
        role: row.role.charAt(0).toUpperCase() + row.role.slice(1)
      }));
    } catch (error) {
      console.error('GCD creator search failed:', error);
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
    if (canceled || !filePath) return { success: false, path: null };
    try {
      await fs.promises.writeFile(filePath, data, 'utf-8');
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
      const data = await fs.promises.readFile(filePaths[0], 'utf-8');
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerIpcHandlers };