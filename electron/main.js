const { app, BrowserWindow, Menu, ipcMain, dialog, shell, protocol } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const ComicFileHandler = require('./fileHandler');
const ComicDatabase = require('./database');

const isDev = process.env.NODE_ENV === 'development';

// Keep a global reference of the window object
let mainWindow;
let fileHandler;
let database;
let knowledgeBasePath;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    show: false, // Don't show until ready
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default'
  });

  // Load the app
  const startUrl = isDev 
    ? 'http://localhost:5173' 
    : `file://${path.join(__dirname, '../dist/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Open DevTools in development
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Initialize services
async function initializeServices() {
  try {
    // Initialize file handler
    fileHandler = new ComicFileHandler();
    
    // Initialize database
    database = new ComicDatabase();
    await database.initialize();

    // Initialize knowledge base
    const userDataPath = app.getPath('userData');
    knowledgeBasePath = path.join(userDataPath, 'userKnowledgeBase.json');
    await initializeKnowledgeBase();
    
    console.log('Services initialized successfully');
  } catch (error) {
    console.error('Error initializing services:', error);
  }
}

// Initialize knowledge base file
async function initializeKnowledgeBase() {
  try {
    await fs.access(knowledgeBasePath);
  } catch (error) {
    // File doesn't exist, create it from default
    const defaultKBPath = path.join(__dirname, '../dist/assets/comicsKnowledge.json');
    try {
      const defaultData = await fs.readFile(defaultKBPath, 'utf-8');
      await fs.writeFile(knowledgeBasePath, defaultData, 'utf-8');
      console.log('User knowledge base created from default.');
    } catch (readError) {
      // Fallback if dist asset is not found (e.g. in dev)
      const devDefaultKBPath = path.join(__dirname, '../src/data/comicsKnowledge.json');
      try {
        const devDefaultData = await fs.readFile(devDefaultKBPath, 'utf-8');
        await fs.writeFile(knowledgeBasePath, devDefaultData, 'utf-8');
        console.log('User knowledge base created from dev default.');
      } catch (devReadError) {
        console.error('Could not find default knowledge base file:', devReadError);
      }
    }
  }
}

// App event handlers
app.whenReady().then(async () => {
  // Register custom protocol for serving cover images securely
  protocol.registerFileProtocol('comic-cover', (request, callback) => {
    const url = request.url.substr('comic-cover://'.length);
    const coverPath = path.join(app.getPath('userData'), 'covers', url);
    console.log('Cover protocol request:', url, '-> Full path:', coverPath);
    callback({ path: path.normalize(coverPath) });
  });

  await initializeServices();
  createWindow();
  createMenu();

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Close database connection
  if (database) {
    database.close();
  }
  
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Add Files...',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            selectComicFiles();
          }
        },
        {
          label: 'Add Folder...',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => {
            selectComicFolder();
          }
        },
        { type: 'separator' },
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            mainWindow.webContents.send('navigate-to', '/app/settings');
          }
        },
        { type: 'separator' },
        {
          role: 'quit'
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Library',
      submenu: [
        {
          label: 'Dashboard',
          accelerator: 'CmdOrCtrl+1',
          click: () => {
            mainWindow.webContents.send('navigate-to', '/app/dashboard');
          }
        },
        {
          label: 'Organize',
          accelerator: 'CmdOrCtrl+2',
          click: () => {
            mainWindow.webContents.send('navigate-to', '/app/organize');
          }
        },
        {
          label: 'Library',
          accelerator: 'CmdOrCtrl+3',
          click: () => {
            mainWindow.webContents.send('navigate-to', '/app/library');
          }
        },
        {
          label: 'Learning',
          accelerator: 'CmdOrCtrl+4',
          click: () => {
            mainWindow.webContents.send('navigate-to', '/app/learning');
          }
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'About Comic Organizer',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Comic Organizer',
              message: 'Comic Organizer',
              detail: 'A comprehensive comic book collection management application.\n\nVersion 1.0.0'
            });
          }
        }
      ]
    }
  ];

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });

    // Window menu
    template[5].submenu = [
      { role: 'close' },
      { role: 'minimize' },
      { role: 'zoom' },
      { type: 'separator' },
      { role: 'front' }
    ];
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// File selection functions
async function selectComicFiles() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Comic Files',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Comic Files', extensions: ['cbr', 'cbz', 'pdf'] },
      { name: 'Comic Archives', extensions: ['cbr', 'cbz'] },
      { name: 'PDF Files', extensions: ['pdf'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    mainWindow.webContents.send('files-selected', result.filePaths);
  }
}

async function selectComicFolder() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Comic Folder',
    properties: ['openDirectory']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    mainWindow.webContents.send('folder-selected', result.filePaths[0]);
  }
}

// IPC Handlers

// App info
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('show-message-box', async (event, options) => {
  const result = await dialog.showMessageBox(mainWindow, options);
  return result;
});

// Dialog handlers
ipcMain.handle('dialog:select-files', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Comic Files',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Comic Files', extensions: ['cbr', 'cbz', 'pdf'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return canceled ? [] : filePaths;
});

ipcMain.handle('dialog:select-folder', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Folder to Scan',
    properties: ['openDirectory']
  });
  if (canceled || filePaths.length === 0) {
    return [];
  }
  // Scan the selected folder and return file paths
  const comicFiles = await fileHandler.scanFolder(filePaths[0]);
  return comicFiles.map(file => file.path);
});


// File operations
ipcMain.handle('read-comic-file', async (event, filePath) => {
  try {
    return await fileHandler.readComicFile(filePath);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('extract-cover', async (event, filePath) => {
  try {
    const coversDir = path.join(app.getPath('userData'), 'covers');
    const coverPath = await fileHandler.extractCover(filePath, coversDir);
    console.log('Cover extracted to:', coverPath);
    return coverPath;
  } catch (error) {
    console.error('Cover extraction error:', error);
    throw error;
  }
});

ipcMain.handle('scan-folder', async (event, folderPath) => {
  try {
    const files = await fileHandler.scanFolder(folderPath);
    return files.map(file => file.path);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('organize-file', async (event, sourcePath, relativeTargetPath) => {
  try {
    const settings = database.getAllSettings();
    // Use a sensible default if libraryPath is not set
    const libraryRoot = settings.libraryPath || path.join(app.getPath('documents'), 'Comic Organizer Library');
    const keepOriginal = settings.keepOriginalFiles !== false;

    const fullTargetPath = path.join(libraryRoot, relativeTargetPath);

    const success = await fileHandler.organizeFile(sourcePath, fullTargetPath, keepOriginal);
    
    if (success) {
      return { success: true, newPath: fullTargetPath };
    } else {
      return { success: false, error: 'File operation failed.' };
    }
  } catch (error) {
    console.error('Organize file error:', error);
    throw error;
  }
});

// Database operations
ipcMain.handle('init-database', async () => {
  // Database is already initialized in app startup
  return true;
});

ipcMain.handle('save-comic', async (event, comic) => {
  try {
    // Generate ID if not provided
    if (!comic.id) {
      comic.id = `comic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Extract cover if file path is provided
    if (comic.filePath && !comic.coverPath) {
      try {
        const coversDir = path.join(app.getPath('userData'), 'covers');
        const coverPath = await fileHandler.extractCover(comic.filePath, coversDir);
        comic.coverPath = coverPath;
        console.log('Cover extracted and saved for comic:', comic.series, 'at:', coverPath);
      } catch (error) {
        console.warn('Could not extract cover for', comic.filePath, error.message);
      }
    }
    
    const savedComic = database.saveComic(comic);
    console.log('Comic saved with cover URL:', savedComic.coverUrl);
    return savedComic;
  } catch (error) {
    console.error('Error saving comic:', error);
    throw error;
  }
});

ipcMain.handle('get-comics', async () => {
  try {
    return database.getComics();
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('update-comic', async (event, comic) => {
  try {
    return database.updateComic(comic);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('delete-comic', async (event, comicId) => {
  try {
    return database.deleteComic(comicId);
  } catch (error) {
    throw error;
  }
});

// Settings operations
ipcMain.handle('get-settings', async () => {
  try {
    return database.getAllSettings();
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('save-settings', async (event, settings) => {
  try {
    for (const [key, value] of Object.entries(settings)) {
      database.saveSetting(key, value);
    }
    return true;
  } catch (error) {
    throw error;
  }
});

// Knowledge Base operations
ipcMain.handle('get-knowledge-base', async () => {
  try {
    const data = await fs.readFile(knowledgeBasePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading knowledge base:', error);
    throw error;
  }
});

ipcMain.handle('save-knowledge-base', async (event, data) => {
  try {
    await fs.writeFile(knowledgeBasePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error saving knowledge base:', error);
    throw error;
  }
});

// Prevent navigation to external URLs
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.origin !== 'http://localhost:5173' && !navigationUrl.startsWith('file://')) {
      event.preventDefault();
    }
  });
});