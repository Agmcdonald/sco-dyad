const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs').promises;
const Store = require('electron-store');

class ComicDatabase {
  constructor() {
    this.db = null;
    this.settingsStore = new Store();
  }

  async initialize() {
    const dbPath = this.settingsStore.get('dbPath', path.join(require('electron').app.getPath('userData'), 'comics.sqlite'));
    
    try {
      await fs.access(path.dirname(dbPath));
    } catch (error) {
      await fs.mkdir(path.dirname(dbPath), { recursive: true });
    }

    this.db = new Database(dbPath);
    this.setupSchema();
  }

  setupSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS comics (
        id TEXT PRIMARY KEY,
        series TEXT,
        issue TEXT,
        year INTEGER,
        publisher TEXT,
        volume TEXT,
        title TEXT,
        publicationDate TEXT,
        summary TEXT,
        rating REAL,
        genre TEXT,
        characters TEXT,
        price TEXT,
        barcode TEXT,
        languageCode TEXT,
        countryCode TEXT,
        coverUrl TEXT,
        filePath TEXT,
        fileSize INTEGER,
        totalPages INTEGER,
        lastReadPage INTEGER,
        dateAdded TEXT,
        lastModified TEXT,
        metadataLastChecked TEXT,
        ignoreInScans INTEGER DEFAULT 0,
        isSeriesCover INTEGER DEFAULT 0,
        comicVineStatus TEXT DEFAULT 'pending',
        comicVineFetchedAt TEXT,
        comicVineRetryAfter TEXT
      );

      CREATE TABLE IF NOT EXISTS creators (
        comicId TEXT,
        name TEXT,
        role TEXT,
        PRIMARY KEY (comicId, name, role),
        FOREIGN KEY (comicId) REFERENCES comics(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS reading_list (
        id TEXT PRIMARY KEY,
        comicId TEXT UNIQUE,
        priority TEXT,
        completed INTEGER,
        dateAdded TEXT,
        dateCompleted TEXT,
        FOREIGN KEY (comicId) REFERENCES comics(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS recently_read (
        id TEXT PRIMARY KEY,
        comicId TEXT UNIQUE,
        dateRead TEXT,
        FOREIGN KEY (comicId) REFERENCES comics(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS comic_vine_rate_limit (
        id INTEGER PRIMARY KEY,
        requests_made INTEGER DEFAULT 0,
        hour_started TEXT,
        next_reset TEXT
      );
    `);

    // --- Schema Migration ---
    // This ensures that older databases are updated with new columns.
    try {
      const columns = this.db.pragma('table_info(comics)');
      const columnNames = columns.map(col => col.name);

      if (!columnNames.includes('contentRating')) {
        this.db.exec('ALTER TABLE comics ADD COLUMN contentRating TEXT');
        console.log('Database schema migrated: Added "contentRating" column to "comics" table.');
      }
      if (!columnNames.includes('ignoreInScans')) {
        this.db.exec('ALTER TABLE comics ADD COLUMN ignoreInScans INTEGER DEFAULT 0');
        console.log('Database schema migrated: Added "ignoreInScans" column to "comics" table.');
      }
      if (!columnNames.includes('comicVineStatus')) {
        this.db.exec('ALTER TABLE comics ADD COLUMN comicVineStatus TEXT DEFAULT "pending"');
        console.log('Database schema migrated: Added "comicVineStatus" column to "comics" table.');
      }
      if (!columnNames.includes('comicVineFetchedAt')) {
        this.db.exec('ALTER TABLE comics ADD COLUMN comicVineFetchedAt TEXT');
        console.log('Database schema migrated: Added "comicVineFetchedAt" column to "comics" table.');
      }
      if (!columnNames.includes('comicVineRetryAfter')) {
        this.db.exec('ALTER TABLE comics ADD COLUMN comicVineRetryAfter TEXT');
        console.log('Database schema migrated: Added "comicVineRetryAfter" column to "comics" table.');
      }
    } catch (error) {
      console.error('Failed to migrate database schema:', error);
    }
  }

  saveSetting(key, value) {
    this.settingsStore.set(key, value);
  }

  getAllSettings() {
    return this.settingsStore.store;
  }

  saveComic(comic) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO comics (
        id, series, issue, year, publisher, volume, title, publicationDate, summary, rating, genre, characters, price, barcode, languageCode, countryCode, coverUrl, filePath, fileSize, totalPages, lastReadPage, dateAdded, lastModified, metadataLastChecked, ignoreInScans, isSeriesCover, contentRating, comicVineStatus, comicVineFetchedAt, comicVineRetryAfter
      ) VALUES (
        @id, @series, @issue, @year, @publisher, @volume, @title, @publicationDate, @summary, @rating, @genre, @characters, @price, @barcode, @languageCode, @countryCode, @coverUrl, @filePath, @fileSize, @totalPages, @lastReadPage, @dateAdded, @lastModified, @metadataLastChecked, @ignoreInScans, @isSeriesCover, @contentRating, @comicVineStatus, @comicVineFetchedAt, @comicVineRetryAfter
      )
    `);
    
    const creatorsStmt = this.db.prepare(`
      INSERT OR IGNORE INTO creators (comicId, name, role) VALUES (?, ?, ?)
    `);

    const transaction = this.db.transaction((c) => {
      // Ensure all fields have default values to prevent "Missing named parameter" errors
      const comicData = {
        id: c.id || null,
        series: c.series || null,
        issue: c.issue || null,
        year: c.year || null,
        publisher: c.publisher || null,
        volume: c.volume || null,
        title: c.title || null,
        publicationDate: c.publicationDate || null,
        summary: c.summary || null,
        rating: c.rating || null,
        genre: c.genre || null,
        characters: c.characters || null,
        price: c.price || null,
        barcode: c.barcode || null,
        languageCode: c.languageCode || null,
        countryCode: c.countryCode || null,
        coverUrl: c.coverUrl || null,
        filePath: c.filePath || null,
        fileSize: c.fileSize || null,
        totalPages: c.totalPages || null,
        lastReadPage: c.lastReadPage || null,
        dateAdded: c.dateAdded || new Date().toISOString(),
        lastModified: new Date().toISOString(),
        metadataLastChecked: c.metadataLastChecked || null,
        ignoreInScans: c.ignoreInScans ? 1 : 0,
        isSeriesCover: c.isSeriesCover ? 1 : 0,
        contentRating: c.contentRating || null,
        comicVineStatus: c.comicVineStatus || 'pending',
        comicVineFetchedAt: c.comicVineFetchedAt || null,
        comicVineRetryAfter: c.comicVineRetryAfter || null,
      };

      stmt.run(comicData);
      
      if (c.creators && c.creators.length > 0) {
        for (const creator of c.creators) {
          creatorsStmt.run(c.id, creator.name, creator.role);
        }
      }
    });

    transaction(comic);
    return this.getComic(comic.id);
  }

  updateComic(comic) {
    const { creators, ...comicData } = comic;
    const fields = Object.keys(comicData).filter(k => k !== 'id');
    const setClause = fields.map(f => `${f} = @${f}`).join(', ');

    const stmt = this.db.prepare(`UPDATE comics SET ${setClause} WHERE id = @id`);
    
    const deleteCreatorsStmt = this.db.prepare('DELETE FROM creators WHERE comicId = ?');
    const insertCreatorsStmt = this.db.prepare('INSERT OR IGNORE INTO creators (comicId, name, role) VALUES (?, ?, ?)');

    const transaction = this.db.transaction((c) => {
      stmt.run({
        ...c,
        lastModified: new Date().toISOString(),
        ignoreInScans: c.ignoreInScans ? 1 : 0, // Ensure boolean is converted to integer
        isSeriesCover: c.isSeriesCover ? 1 : 0,
      });
      
      if (creators) {
        deleteCreatorsStmt.run(c.id);
        for (const creator of creators) {
          insertCreatorsStmt.run(c.id, creator.name, creator.role);
        }
      }
    });

    transaction(comic);
    return this.getComic(comic.id);
  }

  batchUpdateComics(updates) {
    const transaction = this.db.transaction((updatesToApply) => {
      let updatedCount = 0;
      for (const update of updatesToApply) {
        const { id, ...dataToUpdate } = update;
        if (!id || Object.keys(dataToUpdate).length === 0) continue;

        const fields = Object.keys(dataToUpdate);
        const setClause = fields.map(f => `${f} = ?`).join(', ');
        const values = fields.map(f => {
          // Convert boolean to integer for ignoreInScans
          if (f === 'ignoreInScans') {
            return dataToUpdate[f] ? 1 : 0;
          }
          return dataToUpdate[f];
        });

        const stmt = this.db.prepare(`UPDATE comics SET ${setClause} WHERE id = ?`);
        const info = stmt.run(...values, id);
        if (info.changes > 0) {
          updatedCount++;
        }
      }
      return updatedCount;
    });

    return transaction(updates);
  }

  getComic(id) {
    const comic = this.db.prepare('SELECT * FROM comics WHERE id = ?').get(id);
    if (comic) {
      comic.creators = this.db.prepare('SELECT name, role FROM creators WHERE comicId = ?').all(id);
      comic.ignoreInScans = Boolean(comic.ignoreInScans);
      comic.isSeriesCover = Boolean(comic.isSeriesCover);
    }
    return comic;
  }

  getComics() {
    const comics = this.db.prepare('SELECT * FROM comics ORDER BY series, CAST(issue AS REAL), issue').all();
    const creators = this.db.prepare('SELECT * FROM creators').all();
    const creatorsByComic = creators.reduce((acc, creator) => {
      if (!acc[creator.comicId]) acc[creator.comicId] = [];
      acc[creator.comicId].push({ name: creator.name, role: creator.role });
      return acc;
    }, {});

    return comics.map(c => ({
      ...c,
      creators: creatorsByComic[c.id] || [],
      ignoreInScans: Boolean(c.ignoreInScans),
      isSeriesCover: Boolean(c.isSeriesCover),
    }));
  }

  deleteComic(id) {
    const stmt = this.db.prepare('DELETE FROM comics WHERE id = ?');
    const info = stmt.run(id);
    return info.changes > 0;
  }

  importComics(comics) {
    const transaction = this.db.transaction((comicsToImport) => {
      let added = 0;
      let skipped = 0;
      for (const comic of comicsToImport) {
        const existing = this.getComic(comic.id);
        if (existing) {
          skipped++;
        } else {
          this.saveComic(comic);
          added++;
        }
      }
      return { added, skipped };
    });
    return transaction(comics);
  }

  // Comic Vine Rate Limiting Functions
  checkRateLimit() {
    const currentHour = new Date();
    currentHour.setMinutes(0, 0, 0);
    const hourStarted = currentHour.toISOString();
    
    const rateLimitRecord = this.db.prepare('SELECT * FROM comic_vine_rate_limit WHERE hour_started = ?').get(hourStarted);
    
    if (!rateLimitRecord) {
      // New hour, reset counter
      const nextReset = new Date(currentHour.getTime() + 3600000).toISOString();
      this.db.prepare('INSERT OR REPLACE INTO comic_vine_rate_limit (requests_made, hour_started, next_reset) VALUES (0, ?, ?)').run(hourStarted, nextReset);
      return { canProceed: true, requestsRemaining: 200 };
    }
    
    const requestsRemaining = 200 - rateLimitRecord.requests_made;
    return { 
      canProceed: rateLimitRecord.requests_made < 200, 
      requestsRemaining,
      nextReset: rateLimitRecord.next_reset
    };
  }

  incrementRateLimit() {
    const currentHour = new Date();
    currentHour.setMinutes(0, 0, 0);
    const hourStarted = currentHour.toISOString();
    
    this.db.prepare('UPDATE comic_vine_rate_limit SET requests_made = requests_made + 1 WHERE hour_started = ?').run(hourStarted);
  }

  getComicsForComicVineProcessing(limit = 10) {
    return this.db.prepare(`
      SELECT * FROM comics 
      WHERE comicVineStatus = 'pending' 
      AND ignoreInScans != 1
      AND (comicVineRetryAfter IS NULL OR comicVineRetryAfter < datetime('now'))
      ORDER BY dateAdded ASC 
      LIMIT ?
    `).all(limit);
  }

  updateComicVineStatus(comicId, status, fetchedAt = null, retryAfter = null) {
    const stmt = this.db.prepare(`
      UPDATE comics 
      SET comicVineStatus = ?, 
          comicVineFetchedAt = ?, 
          comicVineRetryAfter = ? 
      WHERE id = ?
    `);
    return stmt.run(status, fetchedAt, retryAfter, comicId);
  }

  getComicVineStats() {
    const stats = this.db.prepare(`
      SELECT 
        comicVineStatus,
        COUNT(*) as count
      FROM comics 
      WHERE ignoreInScans != 1
      GROUP BY comicVineStatus
    `).all();
    
    const result = {
      pending: 0,
      fetched: 0,
      failed: 0,
      skipped: 0
    };
    
    stats.forEach(stat => {
      result[stat.comicVineStatus] = stat.count;
    });
    
    return result;
  }

  getComicsByComicVineStatus(status, limit = 50) {
    const comics = this.db.prepare(`
      SELECT * FROM comics 
      WHERE comicVineStatus = ? 
      AND ignoreInScans != 1
      ORDER BY dateAdded DESC 
      LIMIT ?
    `).all(status, limit);
    
    const creators = this.db.prepare('SELECT * FROM creators').all();
    const creatorsByComic = creators.reduce((acc, creator) => {
      if (!acc[creator.comicId]) acc[creator.comicId] = [];
      acc[creator.comicId].push({ name: creator.name, role: creator.role });
      return acc;
    }, {});

    return comics.map(c => ({
      ...c,
      creators: creatorsByComic[c.id] || [],
      ignoreInScans: Boolean(c.ignoreInScans),
      isSeriesCover: Boolean(c.isSeriesCover),
    }));
  }

  resetComicVineStatus(comicIds, newStatus = 'pending') {
    const stmt = this.db.prepare(`
      UPDATE comics 
      SET comicVineStatus = ?, 
          comicVineFetchedAt = NULL, 
          comicVineRetryAfter = NULL 
      WHERE id = ?
    `);
    
    const transaction = this.db.transaction((ids) => {
      let updatedCount = 0;
      for (const comicId of ids) {
        const info = stmt.run(newStatus, comicId);
        if (info.changes > 0) updatedCount++;
      }
      return updatedCount;
    });
    
    return transaction(comicIds);
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = ComicDatabase;