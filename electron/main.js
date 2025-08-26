/**
 * Electron Main Process
 * 
 * This is the entry point for the Electron application. It handles:
 * - Creating and managing the main browser window
 * - Initializing backend services (file handler, database)
 * - Setting up the application menu
 * - Registering IPC (Inter-Process Communication) handlers for communication
 *   with the renderer process (the React app)
 * - Handling application lifecycle events (ready, activate, window-all-closed)
 * - Security settings for the web contents
 */

const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const ComicFileHandler = require('./fileHandler');
const ComicDatabase = require('./database');
const { createMenu } = require('./appMenu');
const { registerIpcHandlers } = require('./ipcManager');

// Check if running in development mode
const isDev = !app.isPackaged;

// Enable remote debugging in development for better diagnostics
if (isDev) {
  app.commandLine.appendSwitch('remote-debugging-port', '9222');
}

// Global references to main window and services
let mainWindow;
let fileHandler;
let database;
let knowledgeBasePath;
let publicCoversDir;

/**
 * Create Main Window
 * Creates and configures the main browser window for the application
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,      // Disable Node.js integration in renderer for security
      contextIsolation: true,      // Isolate renderer from main process
      preload: path.join(__dirname, 'preload.js'), // Script to bridge main and renderer
      enableRemoteModule: false,
      webSecurity: true
    },
    show: false, // Don't show until ready
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default'
  });

  // Determine the URL to load (dev server or packaged file)
  const startUrl = isDev 
    ? 'http://localhost:5173' 
    : `file://${path.join(__dirname, '../dist/index.html')}`;
  
  console.log('Loading URL:', startUrl);
  
  // Load the React application
  mainWindow.loadURL(startUrl).catch(err => {
    console.error('ERROR: Failed to load start URL:', startUrl, err);
  });

  // Show the window once it's ready to avoid a blank screen
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Clean up on close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open external links in the user's default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Error handling for web contents
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', validatedURL, 'Error:', errorCode, errorDescription);
  });
}

/**
 * Initialize Backend Services
 * Sets up the file handler, database, and necessary paths
 */
async function initializeServices() {
  try {
    fileHandler = new ComicFileHandler();
    database = new ComicDatabase();
    await database.initialize();

    const userDataPath = app.getPath('userData');
    knowledgeBasePath = path.join(userDataPath, 'userKnowledgeBase.json');
    
    // Set up covers directory (in userData for packaged app)
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

/**
 * Initialize Knowledge Base File
 * Merges the default knowledge base with the user's custom knowledge base
 * This ensures users get updates to the default KB without losing their custom entries
 */
async function initializeKnowledgeBaseFile() {
  const normalize = (s) => (s || "").trim().toLowerCase();

  try {
    // Determine path to default data files
    const dataDir = isDev
      ? path.join(__dirname, '../src/data')
      : path.join(process.resourcesPath, 'app.asar.unpacked/src/data');

    const defaultSeriesKBPath = path.join(dataDir, 'comicsKnowledge.json');
    const defaultCreatorsKBPath = path.join(dataDir, 'creatorsKnowledge.json');

    // Load default knowledge bases
    let masterSeries = [];
    let masterCreators = [];

    try {
      const masterSeriesData = await fs.readFile(defaultSeriesKBPath, 'utf-8');
      masterSeries = JSON.parse(masterSeriesData);
    } catch (e) {
      console.warn(`Could not load default series file:`, e.message);
    }
    
    try {
      const masterCreatorsData = await fs.readFile(defaultCreatorsKBPath, 'utf-8');
      masterCreators = JSON.parse(masterCreatorsData);
    } catch (e) {
      console.warn(`Could not load default creators file:`, e.message);
    }

    // Load user's knowledge base
    let userKB = { series: [], creators: [] };
    try {
      const userKBData = await fs.readFile(knowledgeBasePath, 'utf-8');
      const parsedUserKB = JSON.parse(userKBData);
      if (Array.isArray(parsedUserKB)) { // Handle old format
        userKB.series = parsedUserKB;
      } else {
        userKB = { series: parsedUserKB.series || [], creators: parsedUserKB.creators || [] };
      }
    } catch (userKbError) {
      console.log('No existing user knowledge base found, will create new one.');
    }

    // Merge series (user data takes precedence)
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

    // Merge creators (user data takes precedence)
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

    // Write the merged knowledge base back to the user's directory
    const finalKB = { series: mergedSeries, creators: mergedCreators };
    await fs.writeFile(knowledgeBasePath, JSON.stringify(finalKB, null, 2), 'utf-8');
    console.log(`Knowledge base merged. Series: ${mergedSeries.length}, Creators: ${mergedCreators.length}`);

  } catch (error) {
    console.error('Could not initialize or merge knowledge base file:', error);
  }
}

/**
 * Application Lifecycle: Ready
 * This event is fired when Electron has finished initialization
 */
app.whenReady().then(async () => {
  await initializeServices();
  
  createWindow();
  createMenu(mainWindow);
  registerIpcHandlers(mainWindow, { fileHandler, database, knowledgeBasePath, publicCoversDir });

  // Handle macOS dock icon click
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

/**
 * Application Lifecycle: Window All Closed
 * This event is fired when all windows have been closed
 */
app.on('window-all-closed', () => {
  if (database) database.close();
  if (process.platform !== 'darwin') app.quit(); // Quit on Windows/Linux
});

/**
 * Security: Web Contents Created
 * This event is fired when a new web contents is created
 * Used to enforce security policies
 */
app.on('web-contents-created', (event, contents) => {
  // Prevent navigation to external sites within the app
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.origin !== 'http://localhost:5173' && !navigationUrl.startsWith('file://')) {
      event.preventDefault();
    }
  });
  
  // Open new windows in external browser
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
});