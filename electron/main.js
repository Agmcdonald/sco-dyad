/**
 * @file Electron Main Process
 * @summary This file is the entry point for the Electron application. It handles window creation,
 * application lifecycle events, and initialization of backend services.
 * @description This script manages the main browser window, sets up the application menu,
 * registers IPC handlers for communication with the renderer process, and ensures
 * security settings are in place. It also performs a pre-flight check for the 'sharp'
 * library to prevent common installation issues.
 */

const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const ComicFileHandler = require('./fileHandler');
const ComicDatabase = require('./database');
const { createMenu } = require('./appMenu');
const { registerIpcHandlers } = require('./ipcManager');
const sharp = require('sharp'); // Import sharp for preflight test

// Check if running in development mode
const isDev = !app.isPackaged;

// Enable remote debugging in development for better diagnostics
if (isDev) {
  app.commandLine.appendSwitch('remote-debugging-port', '9222');
}

// --- Global References ---
/** @type {BrowserWindow | null} */
let mainWindow;
/** @type {ComicFileHandler | null} */
let fileHandler;
/** @type {ComicDatabase | null} */
let database;
/** @type {string | null} */
let knowledgeBasePath;
/** @type {string | null} */
let publicCoversDir;


/**
 * @async
 * @function runSharpPreflight
 * @summary Performs a pre-flight test of the 'sharp' image processing library.
 * @description This function checks if the 'sharp' library is installed and working correctly
 * by attempting to process a sample image. This helps catch common native dependency
 * issues on first launch. A marker file is created in userData to skip the test
 * on subsequent launches unless the `--preflight` flag is passed.
 * @returns {Promise<boolean>} Resolves to `true` if the app should exit after the test (e.g., on forced re-run), `false` otherwise.
 */
async function runSharpPreflight() {
  const userDataDir = app.getPath('userData');
  const markerPath = path.join(userDataDir, 'preflight.done');
  const inputPath = path.join(__dirname, 'test-assets', 'sample.jpg');
  const outDir = path.join(userDataDir, 'covers');
  const outPath = path.join(outDir, 'preflight-cover.jpg');

  const forcePreflight = process.argv.includes('--preflight');

  try {
    const alreadyDone = await fs.access(markerPath).then(() => true).catch(() => false);

    if (alreadyDone && !forcePreflight) {
      console.log('[Preflight] Skipped — already passed once on this install.');
      return false;
    }

    if (forcePreflight) {
      console.log('[Preflight] Override flag detected — running preflight even though marker exists.');
    }

    await fs.mkdir(outDir, { recursive: true });
    const buf = await fs.readFile(inputPath);

    console.log('[Preflight] Starting Sharp test. Buffer size:', buf.length);

    await sharp(buf, { animated: false })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(outPath);

    console.log('✅ [Preflight] Sharp test passed — cover created at', outPath);

    await fs.unlink(outPath).catch(() => {});
    console.log('[Preflight] Cleaned up preflight cover file');

    await fs.writeFile(markerPath, `passed:${new Date().toISOString()}`);
    console.log('[Preflight] Marker file created at', markerPath);

    return forcePreflight;
  } catch (err) {
    console.error('❌ [Preflight] Sharp test FAILED:', err?.message || err);
    return forcePreflight;
  }
}

/**
 * @function createWindow
 * @summary Creates and configures the main browser window.
 * @description This function initializes the `BrowserWindow` with specific dimensions,
 * security settings, and web preferences. It loads the React application from the
 * development server or the local file system, depending on the environment.
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
  
  mainWindow.loadURL(startUrl).catch(err => {
    console.error('ERROR: Failed to load start URL:', startUrl, err);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', validatedURL, 'Error:', errorCode, errorDescription);
  });
}

/**
 * @async
 * @function initializeServices
 * @summary Sets up backend services like the database and file handler.
 * @description This function instantiates the `ComicFileHandler` and `ComicDatabase`,
 * initializes the database connection, and determines the paths for the user's
 * knowledge base and cover images. It ensures the necessary directories exist.
 * @throws {Error} Throws an error if service initialization fails.
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
    
    if (!publicCoversDir) {
      publicCoversDir = path.join(userDataPath, 'covers'); // Fallback to a safe path
      console.warn(`[Main] publicCoversDir was undefined, defaulted to: ${publicCoversDir}`);
    }
    
    await fs.mkdir(publicCoversDir, { recursive: true });
    await initializeKnowledgeBaseFile();
    
    console.log('Services initialized successfully');
    console.log(`[Main] Resolved publicCoversDir: ${publicCoversDir}`);
  } catch (error) {
    console.error('Failed to initialize services:', error);
    throw error;
  }
}

/**
 * @async
 * @function initializeKnowledgeBaseFile
 * @summary Merges the default knowledge base with the user's custom knowledge base.
 * @description This function ensures that users receive updates to the default knowledge
 * base (shipped with the app) without overwriting their own custom entries. It loads
 * both the default and user KBs, merges them (with user entries taking precedence),
 * and writes the result back to the user's data directory.
 */
async function initializeKnowledgeBaseFile() {
  const normalize = (s) => (s || "").trim().toLowerCase();

  try {
    const dataDir = isDev
      ? path.join(__dirname, '../src/data')
      : path.join(process.resourcesPath, 'data');

    const defaultSeriesKBPath = path.join(dataDir, 'comicsKnowledge.json');
    const defaultCreatorsKBPath = path.join(dataDir, 'creatorsKnowledge.json');

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

    let userKB = { series: [], creators: [] };
    try {
      const userKBData = await fs.readFile(knowledgeBasePath, 'utf-8');
      const parsedUserKB = JSON.parse(userKBData);
      if (Array.isArray(parsedUserKB)) {
        userKB.series = parsedUserKB;
      } else {
        userKB = { series: parsedUserKB.series || [], creators: parsedUserKB.creators || [] };
      }
    } catch (userKbError) {
      console.log('No existing user knowledge base found, will create new one.');
    }

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

/**
 * @event app#ready
 * @summary Fired when Electron has finished initialization.
 * @description This is the main entry point for the application's logic after Electron
 * is ready. It runs the preflight check, initializes services, creates the main
 * window and menu, and registers all IPC handlers. It also includes error handling
 * for fatal startup errors.
 */
app.whenReady().then(async () => {
  const shouldExit = await runSharpPreflight();
  if (shouldExit) {
    console.log('[Preflight] Override complete — exiting.');
    app.quit();
    return;
  }

  try {
    await initializeServices();
  } catch (error) {
    console.error('A fatal error occurred during application startup:', error);
    dialog.showErrorBox(
      'Application Startup Error',
      `Failed to initialize critical services. Please check for permission issues or corrupted files in the application's data directory.\n\nError: ${error.message}\n\nThe application will now exit.`
    );
    app.quit();
    return;
  }
  
  createWindow();
  createMenu(mainWindow);
  console.log('[Main] Calling registerIpcHandlers...');
  registerIpcHandlers(mainWindow, { fileHandler, database, knowledgeBasePath, publicCoversDir });

  /**
   * @event app#activate
   * @summary Fired on macOS when the dock icon is clicked and there are no other windows open.
   */
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}).catch(error => {
  console.error('A fatal error occurred during app.whenReady:', error);
  dialog.showErrorBox(
    'Fatal Error',
    'An unexpected error occurred during startup. The application will now exit.'
  );
  app.quit();
});

/**
 * @event app#window-all-closed
 * @summary Fired when all application windows have been closed.
 * @description This handler closes the database connection and quits the application,
 * except on macOS where it's common for applications to remain active.
 */
app.on('window-all-closed', () => {
  if (database) database.close();
  if (process.platform !== 'darwin') app.quit();
});

/**
 * @function forceQuit
 * @summary Forcefully shuts down the application.
 * @description This function is registered to handle `SIGTERM` and `SIGINT` signals.
 * It's primarily used in development to prevent file locking issues during hot-reloads
 * by ensuring the application process exits completely.
 */
const forceQuit = () => {
  console.log('Force quitting application to release file locks for rebuild.');
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.destroy();
  }
  app.exit();
};

process.on('SIGTERM', forceQuit);
process.on('SIGINT', forceQuit);

/**
 * @event app#web-contents-created
 * @summary Fired when a new web contents (e.g., a browser window) is created.
 * @description This security handler prevents the application from navigating to
 * external websites within the app window and ensures that any requests to open
 * a new window are redirected to the user's default external browser.
 */
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