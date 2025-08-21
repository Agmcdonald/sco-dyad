const { Menu, dialog } = require('electron');

// File selection functions, now part of the menu module
async function selectComicFiles(mainWindow) {
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

async function selectComicFolder(mainWindow) {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Comic Folder',
    properties: ['openDirectory']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    mainWindow.webContents.send('folder-selected', result.filePaths[0]);
  }
}

function createMenu(mainWindow) {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Add Files...',
          accelerator: 'CmdOrCtrl+O',
          click: () => selectComicFiles(mainWindow)
        },
        {
          label: 'Add Folder...',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => selectComicFolder(mainWindow)
        },
        { type: 'separator' },
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow.webContents.send('navigate-to', '/app/settings')
        },
        { type: 'separator' },
        { role: 'quit' }
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
          click: () => mainWindow.webContents.send('navigate-to', '/app/dashboard')
        },
        {
          label: 'Library',
          accelerator: 'CmdOrCtrl+2',
          click: () => mainWindow.webContents.send('navigate-to', '/app/library')
        },
        {
          label: 'Organize',
          accelerator: 'CmdOrCtrl+3',
          click: () => mainWindow.webContents.send('navigate-to', '/app/organize')
        },
        {
          label: 'Learning',
          accelerator: 'CmdOrCtrl+4',
          click: () => mainWindow.webContents.send('navigate-to', '/app/learning')
        },
        {
          label: 'Knowledge',
          accelerator: 'CmdOrCtrl+5',
          click: () => mainWindow.webContents.send('navigate-to', '/app/knowledge')
        },
        {
          label: 'Maintenance',
          accelerator: 'CmdOrCtrl+6',
          click: () => mainWindow.webContents.send('navigate-to', '/app/maintenance')
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

  if (process.platform === 'darwin') {
    template.unshift({
      label: 'Comic Organizer',
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

module.exports = { createMenu };