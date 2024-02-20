const electron = require('electron');
const express  = require('express');
const path     = require('path');
const fs       = require('fs');
const ws       = require('ws');
const { exec } = require("child_process");
const find     = require("find-process");
const psnode   = require("ps-node");

const WebSocketClient = require("websocket").client;
const loaderClient = new WebSocketClient();

const http = express();
http.use(express.static(path.join(__dirname, 'dist')));
http.listen(42773);

let window;
let INSTALLATION;
let INJECTED;
let LOADER_CONNECTION
let APP_SOCKET;
let LOADER_COOKIES;
let API_KEY;
let AUTOINJECT;
let ROBLOXOPEN;

function createWindow() {
    window = new electron.BrowserWindow({
        width: 700,
        height: 550,
        frame: false,
        minHeight: 450,
        minWidth: 500
    })

    window.loadURL('http://localhost:42773');
    window.setMenu(null);
    window.setAlwaysOnTop(true, "normal", 1);
}

async function GetCookies() {
    const cwindow = new electron.BrowserWindow({
        width: 700,
        height: 550,
        minHeight: 450,
        minWidth: 500,
        title: "Login to your loader.live account"
    })

    cwindow.webContents.on("did-navigate-in-page", async (_, url) => {
        if (url !== "https://loader.live/dashboard") return;

        let cookies = await cwindow.webContents.session.cookies.get({});
        cookies = cookies.map(a => `${a.name}=${a.value}`);

        console.log(`Set cookies to: ${cookies.join("; ")}`)
        LOADER_COOKIES = cookies.join("; "); 
        createWindow();
        cwindow.close();
        
        console.log("ready!")
    })

    await cwindow.loadURL("https://loader.live/");
}

const app = electron.app;

app.whenReady().then(() => {
    GetCookies();
});

const server = new ws.Server({
    port: 42772
})

server.on('connection', socket => {
    APP_SOCKET = socket;
    socket.on('message', async message => {
        const { op, data } = JSON.parse(message);

        switch (op) {
            case 'close':
                app.quit();
                break
            
            case 'max':
                window.maximize();
                break

            case 'min':
                window.minimize();
                break

            case 'restore':
                window.restore();
                break

            case 'autoinject':
                AUTOINJECT = data.value;
                break

            case 'closeroblox':
                let processes = await find("name", "RobloxPlayerBeta.exe", true);
                if (processes.length <= 0) return;

                psnode.kill(processes.shift().pid, (err) => {
                    if (err) {
                        socket.send(JSON.stringify({
                            op: "error",
                            data: { message: "Failed to kill RobloxPlayerBeta.exe" }
                        }))
                        return;
                    }
                })
                break
                
            case 'disconnect':
                if (!LOADER_CONNECTION) {
                    socket.send(JSON.stringify({
                        op: "error",
                        data: { message: "You aren't connected to RO-EXEC servers" }
                    }))
                    break
                } 

                LOADER_CONNECTION.close();
                LOADER_CONNECTION = undefined;
                break
            case 'reconnect':
                if (!INSTALLATION) {
                    socket.send(JSON.stringify({
                        op: "error",
                        data: { message: "Please select a valid RO-EXEC installation" }
                    }))
                    break
                }

                if (LOADER_CONNECTION || INJECTED) {
                    socket.send(JSON.stringify({
                        op: "error",
                        data: { message: "You are already connected to RO-EXEC" }
                    }))
                    break
                }

                loaderClient.connect(`wss://loader.live/?login_token=%22${API_KEY}%22`, "echo-protocol", "https://loader.live/", { cookie: LOADER_COOKIES });
                break

            case 'openDirectory':
                const dir = await electron.dialog.showOpenDialog(window, { properties: ["openDirectory"] });
                if (!dir) return;

                let root = dir.filePaths.shift()
                if (!fs.existsSync(path.join(root, "launch.cfg"))) {
                    socket.send(JSON.stringify({
                        op: "error",
                        data: { message: "Please select a valid RO-EXEC installation" }
                    }))
                    break
                }

                let adata = fs.readFileSync(path.join(root, "launch.cfg"), "utf-8").split("|")
                if (adata.pop() !== "RO-EXEC") {
                    socket.send(JSON.stringify({
                        op: "error",
                        data: { message: "Please select a valid RO-EXEC installation" }
                    }))
                    break
                }

                INSTALLATION = root;
                API_KEY = adata.shift();

                loaderClient.connect(`wss://loader.live/?login_token=%22${API_KEY}%22`, "echo-protocol", "https://loader.live/", { cookie: LOADER_COOKIES });
                break
a
            case 'inject':
                if (!INSTALLATION) {
                    socket.send(JSON.stringify({
                        op: "error",
                        data: { message: "Please select a valid RO-EXEC installation" }
                    }))
                    break
                }

                if (INJECTED) {
                    socket.send(JSON.stringify({
                        op: "error",
                        data: { message: "RO-EXEC is already injected" }
                    }))
                    break
                }
                
                const file = fs.readdirSync(INSTALLATION);
                file.forEach(file => {
                    if (!file.endsWith(".exe")) return;

                    exec(`${file}`, { cwd: INSTALLATION }, (err) => {
                        if (err && err.code === "EACCES") {
                            socket.send(JSON.stringify({
                                op: "error",
                                data: { message: "Please run this application as Administrator" }
                            })) 
                        } 
                    })
                });
                break

            case 'openFile':
                const files = await electron.dialog.showOpenDialogSync(window, {properties: ['openFile']});
                if (!files) return;

                const content = fs.readFileSync(files[0], 'utf-8');
                socket.send(JSON.stringify({
                    op: 'setEditor',
                    data: {value: content}
                }))
                break
                
            case 'execute':
                if (!INJECTED) return
                LOADER_CONNECTION.send(`<SCRIPT>${data.source}`)
                break
        }
    })
})

loaderClient.on("connect", connection => {
    console.log("Connected to loader.live");

    LOADER_CONNECTION = connection;
    APP_SOCKET.send(JSON.stringify({
        op: "connected",
        data: {}
    }));

    connection.send(JSON.stringify({
        type: 1,
        side_type: "browser"
    }));

    connection.on("message", (message) => {
        if (message.type !== "utf8") return;

        const packet = JSON.parse(message.utf8Data);
        
        if (packet.status === "connected" && !INJECTED) {
            INJECTED = true;
            INJECTING = false;
            APP_SOCKET.send(JSON.stringify({
                op: "injected",
                data: { value: true }
            }))
        }

        if (packet.status === "disconnected" && INJECTED) {
            INJECTED = false;
            APP_SOCKET.send(JSON.stringify({
                op: "injected",
                data: { value: false }
            }))
        }
    });

    connection.on("close", () => {
        LOADER_CONNECTION = undefined;
        APP_SOCKET.send(JSON.stringify({
            op: "disconnected",
            data: {}
        }));
    });

    setInterval(() => {
        connection.send(JSON.stringify({
            type: 2
        }));
    }, 1000);
});

loaderClient.on("connectFailed", (err) => {
    console.log(err);

    APP_SOCKET.send(JSON.stringify({
        op: "connectFailed",
        data: {}
    }));
});

setInterval(async () => {
    let processes = await find("name", "RobloxPlayerBeta.exe", true);
    if (processes.length <= 0) {
        ROBLOXOPEN = false;
        return;
    }

    if (INJECTED || !INSTALLATION || !AUTOINJECT || ROBLOXOPEN) return;

    ROBLOXOPEN = true;

    const file = fs.readdirSync(INSTALLATION);
    file.forEach(file => {
        if (!file.endsWith(".exe")) return;

        exec(`${file}`, { cwd: INSTALLATION }, (err) => {
            if (err && err.code === "EACCES") {
                socket.send(JSON.stringify({
                    op: "error",
                    data: { message: "Please run this application as Administrator" }
                })) 
            } 
        })
    });
}, 5000);