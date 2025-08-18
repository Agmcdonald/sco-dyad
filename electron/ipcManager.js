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

  // GCD Importer
  ipcMain.handle('importer:start', async (event, { issuesPath, sequencesPath }) => {
    const dbPath = path.join(app.getPath('userData'), 'gcd_local.sqlite');
    
    try {
      // Delete old DB if it exists
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
      }
      
      const localDb = new Database(dbPath);
      
      // Create schema
      localDb.exec(`
        CREATE TABLE issues (
          id INTEGER PRIMARY KEY,
          series_name TEXT,
          issue_number TEXT,
          publication_date TEXT,
          publisher_name TEXT
        );
        CREATE TABLE issue_details (
          issue_id INTEGER,
          key TEXT,
          value TEXT,
          PRIMARY KEY (issue_id, key),
          FOREIGN KEY(issue_id) REFERENCES issues(id)
        );
        CREATE TABLE story_details (
          issue_id INTEGER,
          sequence_number INTEGER,
          key TEXT,
          value TEXT,
          PRIMARY KEY (issue_id, sequence_number, key)
        );
        CREATE INDEX idx_issues_series_name ON issues(series_name);
        CREATE INDEX idx_issue_details_issue_id ON issue_details(issue_id);
        CREATE INDEX idx_story_details_issue_id ON story_details(issue_id);
      `);

      const processFile = (filePath, tableName, isIssuesFile) => new Promise((resolve, reject) => {
        const fileStream = fs.createReadStream(filePath);
        const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
        
        let insertStmt;
        if (isIssuesFile) {
          insertStmt = localDb.prepare(`INSERT OR IGNORE INTO ${tableName} (issue_id, key, value) VALUES (?, ?, ?)`);
        } else {
          insertStmt = localDb.prepare(`INSERT OR IGNORE INTO ${tableName} (issue_id, sequence_number, key, value) VALUES (?, ?, ?, ?)`);
        }
        
        const transaction = localDb.transaction((rows) => {
          for (const row of rows) {
            insertStmt.run(row);
          }
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

          if (buffer.length >= 10000) {
            transaction(buffer);
            buffer = [];
            event.sender.send('importer:progress', { percent: 50, message: `Processing ${tableName}: ${lineCount.toLocaleString()} lines...` });
          }
        });

        rl.on('close', () => {
          if (buffer.length > 0) transaction(buffer);
          resolve(lineCount);
        });
        rl.on('error', reject);
      });

      // Process issues.tsv
      event.sender.send('importer:progress', { percent: 10, message: 'Processing issues file...' });
      const issueLines = await processFile(issuesPath, 'issue_details', true);
      
      // Populate main issues table from details
      localDb.exec(`
        INSERT INTO issues (id, series_name, issue_number, publication_date, publisher_name)
        SELECT 
          issue_id,
          MAX(CASE WHEN key = 'series name' THEN value END),
          MAX(CASE WHEN key = 'issue number' THEN value END),
          MAX(CASE WHEN key = 'publication date' THEN value END),
          MAX(CASE WHEN key = 'publisher name' THEN value END)
        FROM issue_details
        GROUP BY issue_id
      `);

      // Process sequences.tsv
      event.sender.send('importer:progress', { percent: 60, message: 'Processing story file...' });
      const sequenceLines = await processFile(sequencesPath, 'story_details', false);

      localDb.close();
      
      // Connect to the new DB for future queries
      if (gcdDb) gcdDb.close();
      gcdDb = new Database(dbPath, { readonly: true, fileMustExist: true });

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
      if (!fs.existsSync(localDbPath)) {
        console.log('Local GCD database not found.');
        return false;
      }
      gcdDb = new Database(localDbPath, { readonly: true, fileMustExist: true });
      console.log('Successfully connected to local GCD database.');
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
        SELECT id, series_name as name, publisher_name as publisher, SUBSTR(publication_date, 1, 4) as year_began
        FROM issues
        WHERE series_name LIKE ?
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
      const issueStmt = gcdDb.prepare(`SELECT * FROM issues WHERE id = ?`);
      const issue = issueStmt.get(seriesId);
      if (!issue) return null;

      const detailsStmt = gcdDb.prepare(`SELECT key, value FROM issue_details WHERE issue_id = ?`);
      const details = detailsStmt.all(seriesId).reduce((acc, row) => {
        acc[row.key.replace(/\s/g, '_')] = row.value;
        return acc;
      }, {});

      const storiesStmt = gcdDb.prepare(`SELECT * FROM story_details WHERE issue_id = ? ORDER BY sequence_number`);
      const storyRows = storiesStmt.all(seriesId);
      
      const stories = {};
      storyRows.forEach(row => {
        if (!stories[row.sequence_number]) stories[row.sequence_number] = { sequence_number: row.sequence_number };
        stories[row.sequence_number][row.key.replace(/\s/g, '_')] = row.value;
      });

      return { ...issue, ...details, stories: Object.values(stories) };
    } catch (error) {
      console.error('GCD issue details search failed:', error);
      return null;
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