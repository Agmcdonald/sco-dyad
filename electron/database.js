const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const fs = require('fs');

class ComicDatabase {
  constructor() {
    this.db = null;
    this.dbPath = null;
  }

  // Initialize the database
  async initialize() {
    try {
      // Create database in user data directory
      const userDataPath = app.getPath('userData');
      this.dbPath = path.join(userDataPath, 'comics.db');
      
      // Ensure directory exists
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Open database connection
      this.db = new Database(this.dbPath);
      
      // Enable foreign keys
      this.db.pragma('foreign_keys = ON');
      
      // Create tables
      this.createTables();
      
      console.log('Database initialized at:', this.dbPath);
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  // Create database tables
  createTables() {
    // Comics table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS comics (
        id TEXT PRIMARY KEY,
        series TEXT NOT NULL,
        issue TEXT NOT NULL,
        year INTEGER,
        publisher TEXT,
        volume TEXT,
        summary TEXT,
        file_path TEXT UNIQUE NOT NULL,
        file_size INTEGER,
        file_type TEXT,
        page_count INTEGER,
        cover_path TEXT,
        date_added TEXT NOT NULL,
        last_modified TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Settings table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Reading progress table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS reading_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        comic_id TEXT NOT NULL,
        current_page INTEGER DEFAULT 1,
        total_pages INTEGER,
        completed BOOLEAN DEFAULT FALSE,
        last_read DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (comic_id) REFERENCES comics (id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_comics_series ON comics (series);
      CREATE INDEX IF NOT EXISTS idx_comics_publisher ON comics (publisher);
      CREATE INDEX IF NOT EXISTS idx_comics_year ON comics (year);
      CREATE INDEX IF NOT EXISTS idx_comics_date_added ON comics (date_added);
    `);
  }

  // Save a comic to the database
  saveComic(comic) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO comics (
          id, series, issue, year, publisher, volume, summary,
          file_path, file_size, file_type, page_count, cover_path,
          date_added, last_modified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        comic.id,
        comic.series,
        comic.issue,
        comic.year,
        comic.publisher,
        comic.volume,
        comic.summary,
        comic.filePath,
        comic.fileSize,
        comic.fileType,
        comic.pageCount,
        comic.coverPath,
        comic.dateAdded,
        comic.lastModified
      );

      return this.getComic(comic.id);
    } catch (error) {
      console.error('Error saving comic:', error);
      throw error;
    }
  }

  // Get a comic by ID
  getComic(id) {
    try {
      const stmt = this.db.prepare('SELECT * FROM comics WHERE id = ?');
      const comic = stmt.get(id);
      return comic ? this.formatComic(comic) : null;
    } catch (error) {
      console.error('Error getting comic:', error);
      throw error;
    }
  }

  // Get all comics
  getComics(limit = null, offset = 0) {
    try {
      let query = 'SELECT * FROM comics ORDER BY date_added DESC';
      if (limit) {
        query += ` LIMIT ${limit} OFFSET ${offset}`;
      }
      
      const stmt = this.db.prepare(query);
      const comics = stmt.all();
      return comics.map(comic => this.formatComic(comic));
    } catch (error) {
      console.error('Error getting comics:', error);
      throw error;
    }
  }

  // Update a comic
  updateComic(comic) {
    try {
      const stmt = this.db.prepare(`
        UPDATE comics SET
          series = ?, issue = ?, year = ?, publisher = ?, volume = ?,
          summary = ?, last_modified = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      const result = stmt.run(
        comic.series,
        comic.issue,
        comic.year,
        comic.publisher,
        comic.volume,
        comic.summary,
        comic.lastModified,
        comic.id
      );

      if (result.changes === 0) {
        throw new Error('Comic not found');
      }

      return this.getComic(comic.id);
    } catch (error) {
      console.error('Error updating comic:', error);
      throw error;
    }
  }

  // Delete a comic
  deleteComic(id) {
    try {
      const stmt = this.db.prepare('DELETE FROM comics WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (error) {
      console.error('Error deleting comic:', error);
      throw error;
    }
  }

  // Search comics
  searchComics(query) {
    try {
      const searchTerm = `%${query}%`;
      const stmt = this.db.prepare(`
        SELECT * FROM comics 
        WHERE series LIKE ? OR publisher LIKE ? OR issue LIKE ?
        ORDER BY series, CAST(issue AS INTEGER)
      `);
      
      const comics = stmt.all(searchTerm, searchTerm, searchTerm);
      return comics.map(comic => this.formatComic(comic));
    } catch (error) {
      console.error('Error searching comics:', error);
      throw error;
    }
  }

  // Get comics by series
  getComicsBySeries(series) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM comics 
        WHERE series = ? 
        ORDER BY CAST(issue AS INTEGER)
      `);
      
      const comics = stmt.all(series);
      return comics.map(comic => this.formatComic(comic));
    } catch (error) {
      console.error('Error getting comics by series:', error);
      throw error;
    }
  }

  // Get comics by publisher
  getComicsByPublisher(publisher) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM comics 
        WHERE publisher = ? 
        ORDER BY series, CAST(issue AS INTEGER)
      `);
      
      const comics = stmt.all(publisher);
      return comics.map(comic => this.formatComic(comic));
    } catch (error) {
      console.error('Error getting comics by publisher:', error);
      throw error;
    }
  }

  // Get library statistics
  getLibraryStats() {
    try {
      const totalComics = this.db.prepare('SELECT COUNT(*) as count FROM comics').get().count;
      
      const seriesCount = this.db.prepare(`
        SELECT COUNT(DISTINCT series) as count FROM comics
      `).get().count;
      
      const publisherCount = this.db.prepare(`
        SELECT COUNT(DISTINCT publisher) as count FROM comics
      `).get().count;
      
      const topPublishers = this.db.prepare(`
        SELECT publisher, COUNT(*) as count 
        FROM comics 
        WHERE publisher IS NOT NULL
        GROUP BY publisher 
        ORDER BY count DESC 
        LIMIT 5
      `).all();

      return {
        totalComics,
        seriesCount,
        publisherCount,
        topPublishers
      };
    } catch (error) {
      console.error('Error getting library stats:', error);
      throw error;
    }
  }

  // Save/get settings
  saveSetting(key, value) {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO settings (key, value, updated_at) 
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `);
      stmt.run(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error saving setting:', error);
      throw error;
    }
  }

  getSetting(key, defaultValue = null) {
    try {
      const stmt = this.db.prepare('SELECT value FROM settings WHERE key = ?');
      const result = stmt.get(key);
      return result ? JSON.parse(result.value) : defaultValue;
    } catch (error) {
      console.error('Error getting setting:', error);
      return defaultValue;
    }
  }

  getAllSettings() {
    try {
      const stmt = this.db.prepare('SELECT key, value FROM settings');
      const settings = stmt.all();
      const result = {};
      settings.forEach(setting => {
        result[setting.key] = JSON.parse(setting.value);
      });
      return result;
    } catch (error) {
      console.error('Error getting all settings:', error);
      return {};
    }
  }

  // Format comic data for frontend
  formatComic(comic) {
    // Instead of using a protocol URL, we'll use a special identifier
    // that the frontend can use to request the image via IPC
    let coverUrl = '/placeholder.svg'; // Default fallback
    
    if (comic.cover_path) {
      // Use a special prefix to indicate this needs to be loaded via IPC
      coverUrl = `electron-cover:${comic.cover_path}`;
      console.log(`[FORMAT-COMIC] ID: ${comic.id}, Cover Path: ${comic.cover_path}, Generated URL: ${coverUrl}`);
    } else {
      console.log(`[FORMAT-COMIC] ID: ${comic.id}, No cover path found, using placeholder`);
    }

    return {
      id: comic.id,
      series: comic.series,
      issue: comic.issue,
      year: comic.year,
      publisher: comic.publisher,
      volume: comic.volume,
      summary: comic.summary,
      filePath: comic.file_path,
      fileSize: comic.file_size,
      fileType: comic.file_type,
      pageCount: comic.page_count,
      coverUrl: coverUrl,
      dateAdded: comic.date_added,
      lastModified: comic.last_modified
    };
  }

  // Close database connection
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

module.exports = ComicDatabase;