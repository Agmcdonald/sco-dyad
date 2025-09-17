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

try {
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
    // Modified to accept an operationId for cancellation
    readComicFile: (filePath, operationId) => ipcRenderer.invoke('read-comic-file', filePath, operationId),
    extractCover: (filePath) => ipcRenderer.invoke('extract-cover', filePath),
    scanFolder: (folderPath, operationId) => ipcRenderer.invoke('scan-folder', folderPath, operationId),
    organizeFile: (filePath, targetPath) => ipcRenderer.invoke('organize-file', filePath, targetPath),
    moveFile: (sourcePath, relativeTargetPath) => ipcRenderer.invoke('move-file', sourcePath, relativeTargetPath),
    
    // Comic Reader Operations
    getComicPages: (filePath) => ipcRenderer.invoke('get-comic-pages', filePath),
    getComicPageDataUrl: (filePath, pageName) => ipcRenderer.invoke('get-comic-page-data-url', filePath, pageName),
    prepareCbrForReading: (filePath) => ipcRenderer.invoke('reader:prepare-cbr', filePath),
    getPageDataUrlFromTemp: (tempDir, pageName) => ipcRenderer.invoke('reader:get-page-from-temp', tempDir, pageName),
    cleanupTempDir: (tempDir) => ipcRenderer.invoke('reader:cleanup-temp-dir', tempDir),
    openPdf: (filePath) => ipcRenderer.invoke('reader:open-pdf', filePath),

    // Database Operations
    initDatabase: () => ipcRenderer.invoke('init-database'),
    saveComic: (comic) => ipcRenderer.invoke('save-comic', comic),
    getComics: () => ipcRenderer.invoke('get-comics'),
    updateComic: (comic) => ipcRenderer.invoke('update-comic', comic),
    batchUpdateComics: (updates) => ipcRenderer.invoke('db:batch-update-comics', updates),
    deleteComic: (comicId, filePath) => ipcRenderer.invoke('delete-comic', comicId, filePath),
    importComics: (comics) => ipcRenderer.invoke('db:import-comics', comics),
    
    // Settings
    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),

    // Knowledge Base
    getKnowledgeBase: () => ipcRenderer.invoke('get-knowledge-base'),
    saveKnowledgeBase: (data) => ipcRenderer.invoke('save-knowledge-base', data),

    // Comic Vine API Proxy
    fetchComicVine: (url, options) => ipcRenderer.invoke('comicvine:fetch', url, options),

    // New: API Usage Tracking
    getApiUsage: () => ipcRenderer.invoke('get-api-usage'),

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

    // New cancellation method
    cancelFileLoading: () => ipcRenderer.invoke('cancel-file-loading'),

    // Cover Management
    getCoversDir: () => ipcRenderer.invoke('app:get-covers-dir'),
    migrateCovers: () => ipcRenderer.invoke('app:migrate-covers'),
  });
} catch (error) {
  console.error('[Preload Script Error] Failed to expose Electron API:', error);
  // You might want to display an alert or log this error more prominently in a real app
}


// Security: Remove Node.js globals from the renderer process
delete window.require;
delete window.exports;
delete window.module;