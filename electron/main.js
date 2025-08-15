const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const ComicFileHandler = require('./fileHandler');
const ComicDatabase = require('./database');
const { createMenu } = require('./appMenu');
const { registerIpcHandlers } = require('./ipcManager');

const isDev = !app.isPackaged;

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
  try {
    await fs.access(knowledgeBasePath);
  } catch {
    const defaultKBPath = isDev
      ? path.join(__dirname, '../src/data/comicsKnowledge.json')
      : path.join(__dirname, '../dist/assets/comicsKnowledge.json');
    try {
      const defaultData = await fs.readFile(defaultKBPath, 'utf-8');
      await fs.writeFile(knowledgeBasePath, defaultData, 'utf-8');
    } catch (error) {
      console.error('Could not create default knowledge base file:', error);
    }
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