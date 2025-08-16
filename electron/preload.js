const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Dialogs
  selectFilesDialog: () => ipcRenderer.invoke('dialog:select-files'),
  selectFolderDialog: () => ipcRenderer.invoke('dialog:select-folder'),

  // Navigation
  onNavigateTo: (callback) => {
    ipcRenderer.on('navigate-to', (event, path) => callback(path));
  },
  
  // File operations
  onFilesSelected: (callback) => {
    ipcRenderer.on('files-selected', (event, filePaths) => callback(filePaths));
  },
  
  onFolderSelected: (callback) => {
    ipcRenderer.on('folder-selected', (event, folderPath) => callback(folderPath));
  },
  
  // File system operations
  readComicFile: (filePath) => ipcRenderer.invoke('read-comic-file', filePath),
  extractCover: (filePath) => ipcRenderer.invoke('extract-cover', filePath),
  getCoverImage: (coverPath) => ipcRenderer.invoke('get-cover-image', coverPath),
  scanFolder: (folderPath) => ipcRenderer.invoke('scan-folder', folderPath),
  organizeFile: (filePath, targetPath) => ipcRenderer.invoke('organize-file', filePath, targetPath),
  
  // Comic Reader operations
  getComicPages: (filePath) => ipcRenderer.invoke('get-comic-pages', filePath),
  getComicPageDataUrl: (filePath, pageName) => ipcRenderer.invoke('get-comic-page-data-url', filePath, pageName),
  prepareCbrForReading: (filePath) => ipcRenderer.invoke('reader:prepare-cbr', filePath),
  getPageDataUrlFromTemp: (tempDir, pageName) => ipcRenderer.invoke('reader:get-page-from-temp', tempDir, pageName),
  cleanupTempDir: (tempDir) => ipcRenderer.invoke('reader:cleanup-temp-dir', tempDir),

  // Database operations
  initDatabase: () => ipcRenderer.invoke('init-database'),
  saveComic: (comic) => ipcRenderer.invoke('save-comic', comic),
  getComics: () => ipcRenderer.invoke('get-comics'),
  updateComic: (comic) => ipcRenderer.invoke('update-comic', comic),
  deleteComic: (comicId, filePath) => ipcRenderer.invoke('delete-comic', comicId, filePath),
  
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),

  // Knowledge Base
  getKnowledgeBase: () => ipcRenderer.invoke('get-knowledge-base'),
  saveKnowledgeBase: (data) => ipcRenderer.invoke('save-knowledge-base', data),
  
  // Dialog
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
  
  // Platform info
  platform: process.platform,
  
  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// Security: Remove Node.js globals in renderer process
delete window.require;
delete window.exports;
delete window.module;