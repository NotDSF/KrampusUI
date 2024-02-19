const electron = require('electron');
const express  = require('express');
const path     = require('path');
const fs       = require('fs');
const ws       = require('ws');
const { execFile } = require("child_process");

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

function createWindow() {
    window = new electron.BrowserWindow({
        width: 700,
        height: 550,
        frame: false,
        minHeight: 450,
        minWidth: 500,
    })

    window.loadURL('http://localhost:42773');
    window.setMenu(null);
    window.setAlwaysOnTop(true, "normal", 1);
}

async function GetCookies() {
    const cwindow = new electron.BrowserWindow({
        width: 700,
        height: 550,
        frame: false,
        minHeight: 450,
        minWidth: 500,
    })

    await cwindow.loadURL("https://loader.live/dashboard/ro-exec")
    LOADER_COOKIES = (await cwindow.webContents.session.cookies.get({})).map(a => `${a.name}=${a.value}`);
    await cwindow.close();
}

const app = electron.app;

app.whenReady().then(() => {
    createWindow()
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

                loaderClient.connect(`wss://loader.live/?login_token=%22${adata.shift()}%22`, "echo-protocol", "https://loader.live/", { cookie: LOADER_COOKIES.join("; ") });
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
                loaderClient.connect(`wss://loader.live/?login_token=%22${adata.shift()}%22`, "echo-protocol", "https://loader.live/", { cookie: LOADER_COOKIES.join("; ") });
                break

            case 'inject':
                if (!INSTALLATION) {
                    socket.send(JSON.stringify({
                        op: "error",
                        data: { message: "Please select a valid RO-EXEC installation" }
                    }))
                    break
                }
                
                const file = fs.readdirSync(INSTALLATION);
                file.forEach(file => {
                    if (!file.endsWith(".exe")) return;

                    execFile(path.join(INSTALLATION, file), function(err) {
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