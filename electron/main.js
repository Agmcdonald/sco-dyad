const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const ComicFileHandler = require('./fileHandler');
const ComicDatabase = require('./database');
const { createMenu } = require('./appMenu');
const { registerIpcHandlers } = require('./ipcManager');

const isDev = !app.isPackaged;

// Enable remote debugging for MCP in development mode
if (isDev) {
  app.commandLine.appendSwitch('remote-debugging-port', '9222');
}

let mainWindow;
let fileHandler;
let database;
let knowledgeBasePath;
let publicCoversDir;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default'
  });

  const startUrl = isDev 
    ? 'http://localhost:5173' 
    : `file://${path.join(__dirname, '../dist/index.html')}`;
  
  mainWindow.loadURL(startUrl).catch(err => {
    console.error('ERROR: Failed to load start URL:', startUrl);
    console.error('Please ensure the Vite development server is running and accessible.');
    console.error(err);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

async function initializeServices() {
  fileHandler = new ComicFileHandler();
  database = new ComicDatabase();
  await database.initialize();

  const userDataPath = app.getPath('userData');
  knowledgeBasePath = path.join(userDataPath, 'userKnowledgeBase.json');
  
  publicCoversDir = isDev 
    ? path.join(__dirname, '../public/covers') 
    : path.join(__dirname, '../dist/covers');
  
  await fs.mkdir(publicCoversDir, { recursive: true });
  await initializeKnowledgeBaseFile();
}

async function initializeKnowledgeBaseFile() {
  const normalize = (s) => (s || "").trim().toLowerCase();

  const defaultKBPath = isDev
    ? path.join(__dirname, '../src/data/comicsKnowledge.json')
    : path.join(__dirname, '../dist/assets/comicsKnowledge.json');

  try {
    // Read the master knowledge base
    const masterKBData = await fs.readFile(defaultKBPath, 'utf-8');
    const masterKB = JSON.parse(masterKBData);

    try {
      // Try to read the user's local knowledge base
      const userKBData = await fs.readFile(knowledgeBasePath, 'utf-8');
      const userKB = JSON.parse(userKBData);

      // Both files exist, so merge them
      const mergedMap = new Map();

      // Add user's entries first to prioritize them
      for (const entry of userKB) {
        if (entry.series) {
          mergedMap.set(normalize(entry.series), entry);
        }
      }

      // Add new entries from the master list
      for (const entry of masterKB) {
        if (entry.series && !mergedMap.has(normalize(entry.series))) {
          mergedMap.set(normalize(entry.series), entry);
        }
      }

      const mergedKB = Array.from(mergedMap.values());
      await fs.writeFile(knowledgeBasePath, JSON.stringify(mergedKB, null, 2), 'utf-8');
      console.log(`Knowledge base merged successfully. Total entries: ${mergedKB.length}`);

    } catch (userKbError) {
      // User's file doesn't exist, so just copy the master file
      await fs.writeFile(knowledgeBasePath, JSON.stringify(masterKB, null, 2), 'utf-8');
      console.log(`Initialized user knowledge base from master. Total entries: ${masterKB.length}`);
    }
  } catch (error) {
    console.error('Could not initialize or merge knowledge base file:', error);
  }
}

app.whenReady().then(async () => {
  await initializeServices();
  
  createWindow();
  createMenu(mainWindow);
  registerIpcHandlers(mainWindow, { fileHandler, database, knowledgeBasePath, publicCoversDir });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (database) database.close();
  if (process.platform !== 'darwin') app.quit();
});

app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.origin !== 'http://localhost:5173' && !navigationUrl.startsWith('file://')) {
      event.preventDefault();
    }
  });
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});