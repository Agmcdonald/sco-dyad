const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
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
  
  // File system operations (to be implemented)
  readComicFile: (filePath) => ipcRenderer.invoke('read-comic-file', filePath),
  extractCover: (filePath) => ipcRenderer.invoke('extract-cover', filePath),
  scanFolder: (folderPath) => ipcRenderer.invoke('scan-folder', folderPath),
  organizeFile: (filePath, targetPath) => ipcRenderer.invoke('organize-file', filePath, targetPath),
  
  // Database operations (to be implemented)
  initDatabase: () => ipcRenderer.invoke('init-database'),
  saveComic: (comic) => ipcRenderer.invoke('save-comic', comic),
  getComics: () => ipcRenderer.invoke('get-comics'),
  updateComic: (comic) => ipcRenderer.invoke('update-comic', comic),
  deleteComic: (comicId) => ipcRenderer.invoke('delete-comic', comicId),
  
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