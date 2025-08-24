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
      preload: path.join(__dirname, 'preload.js'),
      // Add these for better compatibility
      enableRemoteModule: false,
      webSecurity: true
    },
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default'
    // Removed icon reference for now
  });

  const startUrl = isDev 
    ? 'http://localhost:5173' 
    : `file://${path.join(__dirname, '../dist/index.html')}`;
  
  mainWindow.loadURL(startUrl).catch(err => {
    console.error('ERROR: Failed to load start URL:', startUrl);
    if (isDev) {
      console.error('Please ensure the Vite development server is running and accessible.');
    }
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
  try {
    fileHandler = new ComicFileHandler();
    database = new ComicDatabase();
    await database.initialize();

    const userDataPath = app.getPath('userData');
    knowledgeBasePath = path.join(userDataPath, 'userKnowledgeBase.json');
    
    // In packaged app, create covers directory in userData
    if (isDev) {
      publicCoversDir = path.join(__dirname, '../public/covers');
    } else {
      publicCoversDir = path.join(userDataPath, 'covers');
    }
    
    await fs.mkdir(publicCoversDir, { recursive: true });
    await initializeKnowledgeBaseFile();
    
    console.log('Services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize services:', error);
  }
}

async function initializeKnowledgeBaseFile() {
  const normalize = (s) => (s || "").trim().toLowerCase();

  try {
    // In packaged app, data files are in resources/app.asar/src/data
    const dataDir = isDev
      ? path.join(__dirname, '../src/data')
      : path.join(process.resourcesPath, 'app.asar.unpacked/src/data');

    const defaultSeriesKBPath = path.join(dataDir, 'comicsKnowledge.json');
    const defaultCreatorsKBPath = path.join(dataDir, 'creatorsKnowledge.json');

    // Check if files exist before reading
    let masterSeries = [];
    let masterCreators = [];

    try {
      const masterSeriesData = await fs.readFile(defaultSeriesKBPath, 'utf-8');
      masterSeries = JSON.parse(masterSeriesData);
      console.log(`Loaded ${masterSeries.length} master series entries.`);
    } catch (e) {
      console.warn(`Could not load default series file from ${defaultSeriesKBPath}:`, e.message);
    }
    
    try {
      const masterCreatorsData = await fs.readFile(defaultCreatorsKBPath, 'utf-8');
      masterCreators = JSON.parse(masterCreatorsData);
      console.log(`Loaded ${masterCreators.length} master creators entries.`);
    } catch (e) {
      console.warn(`Could not load default creators file from ${defaultCreatorsKBPath}:`, e.message);
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
      console.log('No existing user knowledge base found, will create new one.');
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
    // Create empty knowledge base as fallback
    const emptyKB = { series: [], creators: [] };
    try {
      await fs.writeFile(knowledgeBasePath, JSON.stringify(emptyKB, null, 2), 'utf-8');
      console.log('Created empty knowledge base as fallback.');
    } catch (writeError) {
      console.error('Could not create fallback knowledge base:', writeError);
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
  
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
});