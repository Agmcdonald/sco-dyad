const Store = require('electron-store');

class ComicDatabase {
  constructor() {
    this.store = new Store({
      defaults: {
        comics: [],
        settings: {},
      },
    });
  }

  // No async initialize needed for electron-store
  async initialize() {
    console.log('Database (electron-store) initialized at:', this.store.path);
    return Promise.resolve();
  }

  // Save a comic
  saveComic(comic) {
    try {
      const comics = this.store.get('comics', []);
      comics.push(comic);
      this.store.set('comics', comics);
      return this.getComic(comic.id);
    } catch (error) {
      console.error('Error saving comic:', error);
      throw error;
    }
  }

  // Get a comic by ID
  getComic(id) {
    try {
      const comics = this.store.get('comics', []);
      const comic = comics.find(c => c.id === id);
      return comic ? this.formatComic(comic) : null;
    } catch (error) {
      console.error('Error getting comic:', error);
      throw error;
    }
  }

  // Get all comics
  getComics() {
    try {
      const comics = this.store.get('comics', []);
      // The type assertion is needed because TS can't infer the type of the sort function
      return comics.map(comic => this.formatComic(comic)).sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
    } catch (error) {
      console.error('Error getting comics:', error);
      throw error;
    }
  }

  // Update a comic
  updateComic(updatedComic) {
    try {
      let comics = this.store.get('comics', []);
      const index = comics.findIndex(c => c.id === updatedComic.id);
      if (index === -1) {
        throw new Error('Comic not found');
      }
      comics[index] = { ...comics[index], ...updatedComic };
      this.store.set('comics', comics);
      return this.getComic(updatedComic.id);
    } catch (error) {
      console.error('Error updating comic:', error);
      throw error;
    }
  }

  // Delete a comic
  deleteComic(id) {
    try {
      let comics = this.store.get('comics', []);
      const initialLength = comics.length;
      comics = comics.filter(c => c.id !== id);
      if (comics.length === initialLength) {
        return false; // No comic was deleted
      }
      this.store.set('comics', comics);
      return true;
    } catch (error) {
      console.error('Error deleting comic:', error);
      throw error;
    }
  }

  // Save/get settings
  saveSetting(key, value) {
    try {
      this.store.set(`settings.${key}`, value);
    } catch (error) {
      console.error('Error saving setting:', error);
      throw error;
    }
  }

  getSetting(key, defaultValue = null) {
    try {
      return this.store.get(`settings.${key}`, defaultValue);
    } catch (error) {
      console.error('Error getting setting:', error);
      return defaultValue;
    }
  }

  getAllSettings() {
    try {
      return this.store.get('settings', {});
    } catch (error) {
      console.error('Error getting all settings:', error);
      return {};
    }
  }

  // Format comic data for frontend
  formatComic(comic) {
    // electron-store stores plain objects, so we just ensure defaults
    return {
      ...comic,
      coverUrl: comic.coverUrl || '/placeholder.svg',
    };
  }

  // No close method needed for electron-store
  close() {}
}

module.exports = ComicDatabase;