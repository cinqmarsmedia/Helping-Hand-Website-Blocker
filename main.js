const {
  app,
  BrowserWindow,
  screen,
  Menu,
  ipcMain,
  dialog,
  globalShortcut
} = require("electron");
const hostile = require("hostile");
const path = require("path");
const https = require('https');
const http = require('http');

const os = require('os');


//const globalShortcut = electron.globalShortcut
// const sudo = require('sudo-prompt');
// const sudoOpts = {
//   name: 'Electron Blocking App',
//   //icns: '/Applications/Electron.app/Contents/Resources/Electron.icns', // (optional)
// };


// const Sudoer = require('electron-sudo').default;
// const sudoOpts = { name: 'electron sudo application' },
//   sudoer = new Sudoer(sudoOpts);
const addHostsEntry = require('electron-hostile').addHostsEntry;
//const addHostsEntries = require('electron-hostile').addHostsEntries;
//CUSTOM METHOD:
const addHostsEntriesDirect = require('electron-hostile').addHostsEntriesDirect;
//CUSTOM METHOD:
const removeHostsEntriesAll = require('electron-hostile').removeHostsEntriesAll;
const { electron } = require("process");

const sudoOpts = { name: 'Helping Hand', icon:"app/assets/icon.png" }
const WRAPPER = 'BLOCKERAPP915209129'



function createWindow() {

  globalShortcut.register('`', function () {
    // reload view for quick debugging
    win.reload()
  })


  const getEntries = require('electron-hostile').getEntries
  let { width, height } = screen.getPrimaryDisplay().workAreaSize;


  const win = new BrowserWindow({
    width: 1051,
    height: 720,
    frame: false,
    transparent: false,
    vibrancy: "menu",
    backgroundColor: "#FFF",
    fullscreen: false,
    // show: false,
    webPreferences: {
      nodeIntegration: false,
      sandbox: true,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  //   win.setFullScreenable(true);
  //   win.setFullScreen(true);
  // win.once('ready-to-show', () => {
  //   win.show()
  // })

  ipcMain.on("FULLSCREEN", () => {
    // dialog.showMessageBox(null, win.isFullScreen());
    win.setFullScreen(!win.isFullScreen());
  });

  ipcMain.on("QUIT", () => {
    app.quit();
  });

  ipcMain.on("BLOCK_WEBSITE", async (event, someSite, tag) => {

    addHostsEntry('127.0.0.1', someSite, WRAPPER + ":" + tag + ":" + Date.now() + ":", sudoOpts);


    // sudo.exec('hostile set 127.0.0.1 ' + someSite, sudoOpts, function (error, stdout, stderr) {
    //   if (error) console.log("er[er", error);
    //   console.log('stdout: ' + stdout);
    //   }
    // )

    // hostile.set("127.0.0.1", someSite, (err) => {
    //   if (err) {
    //     console.error(err);
    //     dd("FAILED!");
    //   } else {
    //     dd("SET SUCCESSFULY");
    //   }
    // });

    // const cp = require('child_process')
    // const isRoot = (process.getuid && process.getuid() === 0)

    // if (!isRoot) {
    //   var cmd = 'hostile set 127.0.0.1 ' + someSite
    //   var prompt = `/usr/bin/osascript -e 'do shell script "sh -c \\\"${cmd}\\\"" with administrator privileges'`
    //   cp.exec(prompt, (err, stdout, stderr) => {
    //     dialog.showMessageBox(win, { message: stdout });
    //     dialog.showMessageBox(win, { message: stderr });
    //     if (err) {
    //       dialog.showMessageBox(win, { message: err.message });
    //     }
    //   })
    // }


    // let cp = await sudoer.spawn(
    //   'echo', ['$PARAM'], { env: { PARAM: 'VALUE' } }
    // );
    // cp.on('close', () => {
    //   console.log(cp.output.stdout.toString(), cp.output.stderr.toString());
    //   /*
    //     cp.output.stdout (Buffer)
    //     cp.output.stderr (Buffer)
    //   */
    // });

  });



  async function hostsEntries() {
    let groups = [];
    let entries = await getEntries(true);
    let running = false;
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].length === 1) {
        if (entries[i][0].includes("START " + WRAPPER)) {
          running = true;
        }
        if (entries[i][0].includes("END " + WRAPPER)) {
          running = false;
        }
      } else {
        if (running) {
          groups.push(entries[i][1]);
        }
      }
    }
    return groups;
  }


  async function hostsTags() {
    let tags = {};
    let es = await getEntries(true);
    for (let i = 0; i < es.length; i++) {
      if (es[i].length === 1) {
        if (es[i][0].includes("START " + WRAPPER)) {
          let tagData = es[i][0].split(WRAPPER)[1].split(":");
          let tag = tagData[1];
          let ts = tagData[2];
          if (!tags[tag]) {
            tags[tag] = [];
          }
          tags[tag].push(ts);
        }
      }
    }
    console.log(tags);
    win.webContents.send("SEND_TAGS", tags);


  }

  async function blockSites(sites, tag) {
    //do the deduplicaiton first. Remove all sites from the sites array that are already present in the hosts file.
    const currentEntries = await hostsEntries();
    const set = new Set(currentEntries);

    const dedupSites = [];
    for (let i = 0; i < sites.length; i++) {
      const r = new RegExp("^\s*$");
      if (r.test(sites[i])) {
        continue;
      }
      if (!set.has(sites[i])) {
        dedupSites.push({
          ip: '127.0.0.1',
          host: sites[i],
          wrapper: WRAPPER + ":" + tag + ":" + Date.now() + ":"
        })
      }
    }
    if (dedupSites.length == 0) {
      console.log("EMPTY LIST")
      return Promise.resolve();
    }
    return addHostsEntriesDirect(dedupSites, sudoOpts);
  }

  ipcMain.on("BLOCK_WEBSITES", async (event, sites, tag) => {
    try {
      await blockSites(sites, tag);
      win.webContents.send("BLOCKED_WEBSITES", id);
    } catch (err) {
      win.webContents.send("BLOCKED_WEBSITES", id, err);
    }
  });

  ipcMain.on("BLOCK_LIST", async (event, file, tag) => {
    //read list 
    const sites = fs.readFileSync(file).split('\n');
    blockSites(sites, tag);
  })

  function streamToString(stream) {
    const chunks = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', (err) => reject(err));
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    })
  }

  ipcMain.on("BLOCK_LIST_URL", async (event, url, tag) => {
    let h = http;
    if (url.substring(0, 5) == "https") {
      h = https;
    }

    h.get(url, async res => {
      let sitesText = await streamToString(res)
      blockSites(sitesText.split("\n"), tag);
      win.webContents.send("BLOCKED_LIST_URLS", id);
    })
  });

  ipcMain.on("BLOCK_LIST_URLS", async (event, urls, tag, id, sitesText = "") => {
    let h = http;
    let promises = [];
    urls.forEach((url, i) => {
      if (url.substring(0, 5) == "https") {
        h = https;
      }
      promises.push(new Promise((resolve, reject) => {
        h.get(url, async res => {
          const { statusCode } = res;
          if (statusCode < 200 || statusCode >= 300) {
            reject("Unable to load URL: " + url + ", Status code " + statusCode)
            return;
          }
          sitesText += await streamToString(res)
          resolve();
        }).on("error", (e) => {
          reject(e.message);
        })
      }))
    })

    Promise.all(promises)
      .then(() => {
        return blockSites(sitesText.split("\n"), tag);
      })
      .then(() => {
        win.webContents.send("BLOCKED_LIST_URLS", id);
      })
      .catch(err => {
        win.webContents.send("BLOCKED_LIST_URLS", id, err);
      })
  });


  ipcMain.on("BLOCK_LISTS", async (event, files, tag, id, sites = "") => {
    //read list 
    files.forEach(file => {
      sites += fs.readFileSync(file).split('\n');
    })
    try {
      await blockSites(sites, tag);
      win.webContents.send("BLOCKED_LISTS", id);
    } catch (err) {
      win.webContents.send("BLOCKED_LISTS", id, err);
    }
  });



  ipcMain.on("GET_TAGS", () => {
    hostsTags();
  })

  ipcMain.on("REMOVE", async (event, tag) => {
    const wrapper = tag ? (WRAPPER + ":" + tag) : (WRAPPER);

    try {
      await removeHostsEntriesAll(wrapper, sudoOpts);
      win.webContents.send("REMOVED");
    } catch (err) {
      win.webContents.send("REMOVED", err);
    }
  });
  ipcMain.on("GET_HASH", () => {
    win.webContents.send("SEND_HASH", os.userInfo().username);
  })

  const isMac = process.platform === "darwin";
  const template = [
    // { role: 'appMenu' }
    ...(isMac
      ? [
        {
          label: app.name,
          submenu: [
            { role: "about" },
            { type: "separator" },
            { role: "services" },
            { type: "separator" },
            { role: "hide" },
            { role: "hideothers" },
            { role: "unhide" },
            { type: "separator" },
            { role: "quit" },
          ],
        },
      ]
      : []),
    // { role: 'fileMenu' }
    {
      label: "File",
      submenu: [isMac ? { role: "close" } : { role: "quit" }],
    },
    // { role: 'editMenu' }
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        ...(isMac
          ? [{ role: "delete" }, { role: "selectAll" }]
          : [{ role: "delete" }, { type: "separator" }, { role: "selectAll" }]),
      ],
    },
    // { role: 'viewMenu' }
    {
      label: "View",
      submenu: [{ role: "togglefullscreen" }],
    },
    // { role: 'windowMenu' }
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        ...(isMac
          ? [
            { type: "separator" },
            { role: "front" },
            { type: "separator" },
            { role: "window" },
          ]
          : [{ role: "close" }]),
      ],
    },
    {
      role: "help",
      submenu: [
        {
          label: "Learn More",
          click: async () => {
            const { shell } = require("electron");
            await shell.openExternal("https://cinqmarsmedia.com");
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  win.setMenuBarVisibility(false);
  win.setMenu(null);
  win.webContents.openDevTools();
  // if (reset) {
  //   win.loadFile("www/index.html", { hash: "reset" });
  // } else {
  win.loadFile("app/index.html");
  // }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();

  }
});

//(.*)+a(.*)a(.*)a
