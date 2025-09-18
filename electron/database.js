const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs').promises;
let Store = require('electron-store');

if (Store && Store.default) {
  Store = Store.default;
}

/**
 * @class ComicDatabase
 * @summary Manages all database operations for the comic book library.
 * @description This class encapsulates the logic for interacting with the SQLite database
 * using `better-sqlite3`. It handles schema creation, migrations, and all CRUD
 * operations for comics, creators, and other related data. It also uses `electron-store`
 * to manage application settings.
 */
class ComicDatabase {
  /**
   * @constructor
   * @description Initializes the database and settings store instances.
   */
  constructor() {
    /** @type {import('better-sqlite3').Database | null} */
    this.db = null;
    /** @type {Store} */
    this.settingsStore = new Store();
  }

  /**
   * @async
   * @function initialize
   * @summary Initializes the database connection and sets up the schema.
   * @description This method gets the database path from settings (or uses a default),
   * ensures the directory exists, opens the database connection, and calls `setupSchema`.
   */
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

  /**
   * @function setupSchema
   * @summary Defines and creates the database schema if it doesn't exist.
   * @description This method creates the `comics`, `creators`, `reading_list`, and
   * `recently_read` tables. It also includes a simple migration system to add
   * new columns to the `comics` table in older databases.
   */
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
        isSeriesCover INTEGER DEFAULT 0
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
    `);

    // --- Schema Migration ---
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
    } catch (error) {
      console.error('Failed to migrate database schema:', error);
    }
  }

  /**
   * @function saveSetting
   * @summary Saves a key-value pair to the settings store.
   * @param {string} key - The setting key.
   * @param {*} value - The setting value.
   */
  saveSetting(key, value) {
    try {
      this.settingsStore.set(key, value);
    } catch (error) {
      console.error(`[DB] Failed to save setting '${key}' with value '${value}':`, error);
      throw new Error(`Failed to save setting '${key}'. Please check file permissions. Error: ${error.message}`);
    }
  }

  /**
   * @function getAllSettings
   * @summary Retrieves all settings from the settings store.
   * @returns {object} An object containing all settings.
   */
  getAllSettings() {
    return this.settingsStore.store;
  }

  /**
   * @function saveComic
   * @summary Saves or replaces a comic and its creators in the database.
   * @param {object} comic - The comic object to save.
   * @returns {object} The saved comic object, retrieved from the database.
   */
  saveComic(comic) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO comics (
        id, series, issue, year, publisher, volume, title, publicationDate, summary, rating, genre, characters, price, barcode, languageCode, countryCode, coverUrl, filePath, fileSize, totalPages, lastReadPage, dateAdded, lastModified, metadataLastChecked, ignoreInScans, isSeriesCover, contentRating
      ) VALUES (
        @id, @series, @issue, @year, @publisher, @volume, @title, @publicationDate, @summary, @rating, @genre, @characters, @price, @barcode, @languageCode, @countryCode, @coverUrl, @filePath, @fileSize, @totalPages, @lastReadPage, @dateAdded, @lastModified, @metadataLastChecked, @ignoreInScans, @isSeriesCover, @contentRating
      )
    `);
    
    const creatorsStmt = this.db.prepare(`
      INSERT OR IGNORE INTO creators (comicId, name, role) VALUES (?, ?, ?)
    `);

    const transaction = this.db.transaction((c) => {
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

  /**
   * @function updateComic
   * @summary Updates an existing comic in the database.
   * @param {object} comic - The comic object with updated fields. It must include an `id`.
   * @returns {object} The updated comic object.
   */
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
        ignoreInScans: c.ignoreInScans ? 1 : 0,
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

  /**
   * @function batchUpdateComics
   * @summary Updates multiple comics in a single transaction.
   * @param {object[]} updates - An array of update objects. Each object must have an `id` and the fields to update.
   * @returns {number} The number of comics that were successfully updated.
   */
  batchUpdateComics(updates) {
    const transaction = this.db.transaction((updatesToApply) => {
      let updatedCount = 0;
      for (const update of updatesToApply) {
        const { id, ...dataToUpdate } = update;
        if (!id || Object.keys(dataToUpdate).length === 0) continue;

        const fields = Object.keys(dataToUpdate);
        const setClause = fields.map(f => `${f} = ?`).join(', ');
        const values = fields.map(f => {
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

  /**
   * @function getComic
   * @summary Retrieves a single comic from the database by its ID.
   * @param {string} id - The ID of the comic to retrieve.
   * @returns {object | undefined} The comic object, or `undefined` if not found.
   */
  getComic(id) {
    const comic = this.db.prepare('SELECT * FROM comics WHERE id = ?').get(id);
    if (comic) {
      comic.creators = this.db.prepare('SELECT name, role FROM creators WHERE comicId = ?').all(id);
      comic.ignoreInScans = Boolean(comic.ignoreInScans);
      comic.isSeriesCover = Boolean(comic.isSeriesCover);
    }
    return comic;
  }

  /**
   * @function getComics
   * @summary Retrieves all comics from the database.
   * @returns {object[]} An array of all comic objects.
   */
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

  /**
   * @function deleteComic
   * @summary Deletes a comic from the database.
   * @param {string} id - The ID of the comic to delete.
   * @returns {boolean} `true` if a comic was deleted, `false` otherwise.
   */
  deleteComic(id) {
    const stmt = this.db.prepare('DELETE FROM comics WHERE id = ?');
    const info = stmt.run(id);
    return info.changes > 0;
  }

  /**
   * @function importComics
   * @summary Imports an array of comics into the database, skipping duplicates.
   * @param {object[]} comics - An array of comic objects to import.
   * @returns {{added: number, skipped: number}} An object with counts of added and skipped comics.
   */
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

  /**
   * @function close
   * @summary Closes the database connection.
   */
  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = ComicDatabase;