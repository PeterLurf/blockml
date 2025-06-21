const { app, BrowserWindow, Menu, dialog, shell } = require('electron')
const path = require('path')
const isDev = process.env.NODE_ENV === 'development'

// Keep a global reference of the window object
let mainWindow

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false // Don't show until ready
  })

  // Load the app
  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../out/index.html')}`
  
  mainWindow.loadURL(startUrl)

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    
    if (isDev) {
      mainWindow.webContents.openDevTools()
    }
  })

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            // Send message to renderer to create new project
            if (mainWindow) {
              mainWindow.webContents.send('menu-new-project')
            }
          }
        },
        {
          label: 'Open Project',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            if (mainWindow) {
              const result = await dialog.showOpenDialog(mainWindow, {
                properties: ['openFile'],
                filters: [
                  { name: 'BlockML Projects', extensions: ['blockml', 'json'] },
                  { name: 'All Files', extensions: ['*'] }
                ]
              })
              
              if (!result.canceled && result.filePaths.length > 0) {
                mainWindow.webContents.send('menu-open-project', result.filePaths[0])
              }
            }
          }
        },
        {
          label: 'Save Project',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-save-project')
            }
          }
        },
        {
          label: 'Export Model',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-export-model')
            }
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
        { role: 'paste' },
        { role: 'selectall' }
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
      label: 'Training',
      submenu: [
        {
          label: 'Start Training',
          accelerator: 'F5',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-start-training')
            }
          }
        },
        {
          label: 'Stop Training',
          accelerator: 'Shift+F5',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-stop-training')
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Training Settings',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-training-settings')
            }
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About BlockML',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About BlockML',
              message: 'BlockML',
              detail: 'Visual Neural Network Builder and Training Environment\nVersion 1.0.0\n\nBuild, train, and deploy neural networks with a visual drag-and-drop interface.',
              buttons: ['OK']
            })
          }
        },
        {
          label: 'Documentation',
          click: () => {
            shell.openExternal('https://github.com/blockml/docs')
          }
        },
        { type: 'separator' },
        {
          label: 'Report Issue',
          click: () => {
            shell.openExternal('https://github.com/blockml/issues')
          }
        }
      ]
    }
  ]

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
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    })

    // Window menu
    template.push({
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    })
  }

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// App event handlers
app.whenReady().then(() => {
  createWindow()
  createMenu()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault()
    shell.openExternal(navigationUrl)
  })
})

// Handle protocol for deep linking (optional)
app.setAsDefaultProtocolClient('blockml')

// Auto-updater events (for future implementation)
// require('update-electron-app')()

module.exports = { mainWindow }
