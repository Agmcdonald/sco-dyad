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

  const defaultSeriesKBPath = isDev
    ? path.join(__dirname, '../src/data/comicsKnowledge.json')
    : path.join(__dirname, '../dist/assets/comicsKnowledge.json');
  
  const defaultCreatorsKBPath = isDev
    ? path.join(__dirname, '../src/data/creatorsKnowledge.json')
    : path.join(__dirname, '../dist/assets/creatorsKnowledge.json');

  try {
    // Read the master knowledge bases
    const masterSeriesData = await fs.readFile(defaultSeriesKBPath, 'utf-8');
    const masterSeries = JSON.parse(masterSeriesData);
    
    let masterCreators = [];
    try {
      const masterCreatorsData = await fs.readFile(defaultCreatorsKBPath, 'utf-8');
      masterCreators = JSON.parse(masterCreatorsData);
    } catch (e) {
      console.log('No default creators file found. Skipping.');
    }

    let userKB = { series: [], creators: [] };
    try {
      // Try to read the user's local knowledge base
      const userKBData = await fs.readFile(knowledgeBasePath, 'utf-8');
      const parsedUserKB = JSON.parse(userKBData);
      if (Array.isArray(parsedUserKB)) { // Handle old format
        userKB.series = parsedUserKB;
      } else {
        userKB = { series: parsedUserKB.series || [], creators: parsedUserKB.creators || [] };
      }
    } catch (userKbError) {
      // User file doesn't exist, will be created.
    }

    // Merge Series
    const seriesMap = new Map();
    for (const entry of userKB.series) {
      if (entry.series) seriesMap.set(normalize(entry.series), entry);
    }
    for (const entry of masterSeries) {
      if (entry.series && !seriesMap.has(normalize(entry.series))) {
        seriesMap.set(normalize(entry.series), entry);
      }
    }
    const mergedSeries = Array.from(seriesMap.values());

    // Merge Creators
    const creatorsMap = new Map();
    for (const entry of userKB.creators) {
      if (entry.name) creatorsMap.set(normalize(entry.name), entry);
    }
    for (const entry of masterCreators) {
      if (entry.name && !creatorsMap.has(normalize(entry.name))) {
        creatorsMap.set(normalize(entry.name), entry);
      }
    }
    const mergedCreators = Array.from(creatorsMap.values());

    const finalKB = { series: mergedSeries, creators: mergedCreators };
    await fs.writeFile(knowledgeBasePath, JSON.stringify(finalKB, null, 2), 'utf-8');
    console.log(`Knowledge base merged. Series: ${mergedSeries.length}, Creators: ${mergedCreators.length}`);

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