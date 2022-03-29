const {
    contextBridge,
    ipcRenderer,
} = require("electron");


const exposedFunctions = {
    quit: () => {
        ipcRenderer.send("QUIT");
    },
    fullscreen: () => {
        ipcRenderer.send("FULLSCREEN");
    },
    blockWebsite: function (siteName, tag) {
        // ipcRenderer.send("BLOCK_WEBSITE", siteName, tag);
        return exposedFunctions.blockWebsites([siteName], tag);
    },
    blockWebsites: (siteNames, tag) => {
        // const id = Date.now();
        // ipcRenderer.send("BLOCK_WEBSITES", siteNames, tag);
        // return new Promise((resolve, reject) => {
        //     ipcRenderer.on("BLOCKED_WEBSITES", (event, ident, err) => {
        //         if (ident == id) {
        //             if (typeof err !== "undefined") {
        //                 reject(err);
        //             }
        //             resolve();
        //         }
        //     });
        // });
        return exposedFunctions.blockListUrls([], tag, siteNames);
    },
    blockListUrl: function (url, tag) {
        // ipcRenderer.send("BLOCK_LIST_URL", url, tag)
        return exposedFunctions.blockListUrls([url], tag);
    },
    blockList: function (path, tag) {
        //ipcRenderer.send("BLOCK_LIST", path, tag);
        return exposedFunctions.blockLists([path], tag);
    },
    getTags: () => {
        ipcRenderer.send("GET_TAGS");
        return new Promise((resolve) => {
            ipcRenderer.on("SEND_TAGS", (event, tags) => {
                resolve(tags);
            });
        })
    },
    getHash: () => {
        ipcRenderer.send("GET_HASH");
        return new Promise((resolve) => {
            ipcRenderer.on("SEND_HASH", (event, hash) => {
                resolve(hash);
            });
        })
    },
    blockLists: (paths, tag, sites) => {
        const id = Date.now();
        ipcRenderer.send("BLOCK_LISTS", paths, tag, id, sites);
        return new Promise((resolve, reject) => {
            ipcRenderer.on("BLOCKED_LISTS", (event, ident, err) => {
                if (ident == id) {
                    if (typeof err !== "undefined") {
                        reject(err);
                    }
                    resolve();
                }
            });
        });
    },
    blockListUrls: (urls, tag, sites) => {
        const id = Date.now();
        ipcRenderer.send("BLOCK_LIST_URLS", urls, tag, id, sites);
        return new Promise((resolve, reject) => {
            ipcRenderer.on("BLOCKED_LIST_URLS", (event, ident, err) => {
                if (ident == id) {
                    if (typeof err !== "undefined") {
                        reject(err);
                    }
                    resolve();
                }
            });
        });
    },
    removeAll: (tag) => {
        ipcRenderer.send("REMOVE", tag);
        return new Promise((resolve, reject) => {
            ipcRenderer.on("REMOVED", (event, err) => {
                if (typeof err !== "undefined") {
                    reject(err);
                }
                resolve();
            });
        });
    }
}


contextBridge.exposeInMainWorld(
    "electron",
    exposedFunctions
);
