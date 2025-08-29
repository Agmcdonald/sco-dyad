/**
 * Electron Preload Script
 * 
 * This script runs in a privileged environment with access to both the Node.js APIs
 * of the main process and the DOM APIs of the renderer process.
 * 
 * Its primary purpose is to securely expose a limited set of main process functionalities
 * to the renderer process (the React app) via the `contextBridge`.
 * 
 * This is a critical security feature that prevents the renderer process from having
 * direct access to powerful Node.js APIs, reducing the attack surface.
 * 
 * All functions exposed here are asynchronous and use `ipcRenderer.invoke` to
 * communicate with the main process, where the actual logic is executed.
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose a secure API to the renderer process under `window.electronAPI`
contextBridge.exposeInMainWorld('electronAPI', {
  // App Information
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Dialogs for file/folder selection
  selectFilesDialog: () => ipcRenderer.invoke('dialog:select-files'),
  selectFolderDialog: () => ipcRenderer.invoke('dialog:select-folder'),

  // Navigation events from main process menu
  onNavigateTo: (callback) => {
    ipcRenderer.on('navigate-to', (event, path) => callback(path));
  },
  
  // File selection events from main process menu
  onFilesSelected: (callback) => {
    ipcRenderer.on('files-selected', (event, filePaths) => callback(filePaths));
  },
  onFolderSelected: (callback) => {
    ipcRenderer.on('folder-selected', (event, folderPath) => callback(folderPath));
  },
  
  // File System Operations
  readComicFile: (filePath) => ipcRenderer.invoke('read-comic-file', filePath),
  extractCover: (filePath) => ipcRenderer.invoke('extract-cover', filePath),
  scanFolder: (folderPath) => ipcRenderer.invoke('scan-folder', folderPath),
  organizeFile: (filePath, targetPath) => ipcRenderer.invoke('organize-file', filePath, targetPath),
  
  // Comic Reader Operations
  getComicPages: (filePath) => ipcRenderer.invoke('get-comic-pages', filePath),
  getComicPageDataUrl: (filePath, pageName) => ipcRenderer.invoke('get-comic-page-data-url', filePath, pageName),
  prepareCbrForReading: (filePath) => ipcRenderer.invoke('reader:prepare-cbr', filePath),
  getPageDataUrlFromTemp: (tempDir, pageName) => ipcRenderer.invoke('reader:get-page-from-temp', tempDir, pageName),
  cleanupTempDir: (tempDir) => ipcRenderer.invoke('reader:cleanup-temp-dir', tempDir),

  // Database Operations
  initDatabase: () => ipcRenderer.invoke('init-database'),
  saveComic: (comic) => ipcRenderer.invoke('save-comic', comic),
  getComics: () => ipcRenderer.invoke('get-comics'),
  updateComic: (comic) => ipcRenderer.invoke('update-comic', comic),
  deleteComic: (comicId, filePath) => ipcRenderer.invoke('delete-comic', comicId, filePath),
  importComics: (comics) => ipcRenderer.invoke('db:import-comics', comics),
  
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),

  // GCD Importer (temporarily disabled)
  importerStart: (paths) => ipcRenderer.invoke('importer:start', paths),
  onImporterProgress: (callback) => {
    ipcRenderer.on('importer:progress', (event, data) => callback(data));
  },

  // GCD Database (temporarily disabled)
  gcdDbConnect: (dbPath) => ipcRenderer.invoke('gcd-db:connect', dbPath),
  gcdDbDisconnect: () => ipcRenderer.invoke('gcd-db:disconnect'),
  gcdDbSearchSeries: (seriesName) => ipcRenderer.invoke('gcd-db:search-series', seriesName),
  gcdDbGetIssueDetails: (seriesId, issueNumber) => ipcRenderer.invoke('gcd-db:get-issue-details', seriesId, issueNumber),
  gcdDbGetIssueCreators: (issueId) => ipcRenderer.invoke('gcd-db:get-issue-creators', issueId),
  gcdDbSearchPublishers: (query) => ipcRenderer.invoke('gcd-db:search-publishers', query),

  // Knowledge Base
  getKnowledgeBase: () => ipcRenderer.invoke('get-knowledge-base'),
  saveKnowledgeBase: (data) => ipcRenderer.invoke('save-knowledge-base', data),

  // Backup and Restore
  saveBackup: (data) => ipcRenderer.invoke('dialog:save-backup', data),
  loadBackup: () => ipcRenderer.invoke('dialog:load-backup'),

  // General Dialogs
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
  
  // Help Manual
  onOpenManual: (callback) => {
    ipcRenderer.on('open-manual', () => callback());
  },

  // Platform Information
  platform: process.platform,
  
  // Event Listener Management
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },

  // Cover Management
  getCoversDir: () => ipcRenderer.invoke('app:get-covers-dir'),
  migrateCovers: () => ipcRenderer.invoke('app:migrate-covers'),
});

// Security: Remove Node.js globals from the renderer process
delete window.require;
delete window.exports;
delete window.module;