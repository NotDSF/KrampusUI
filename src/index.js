const electron = require('electron');
const express  = require('express');
const path     = require('path');
const fs       = require('fs');
const ws       = require('ws');
const find     = require("find-process");
const { exec } = require("child_process");

const WebSocketClient = require("websocket").client;
const loaderClient = new WebSocketClient();

const http = express();
http.use(express.static(path.join(__dirname, 'dist')));
http.listen(42773);

let window;
let INJECTED;
let LOADER_CONNECTION
let APP_SOCKET;
let LOADER_COOKIES;
let API_KEY;

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
    let CDATA;
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
        
        CDATA = electron.clipboard.readText("clipboard");
        electron.clipboard.writeText("", "clipboard");
        await cwindow.webContents.executeJavaScript("document.getElementsByClassName('btn flex justify-center items-center px-1')[0].click()")

        let id;
        id = setInterval(async () => {
            let newc = electron.clipboard.readText("clipboard");
            if (newc == CDATA) {
                await cwindow.webContents.executeJavaScript("document.getElementsByClassName('btn flex justify-center items-center px-1')[0].click()")
                return;
            }

            API_KEY = newc;

            clearInterval(id);
            createWindow();
            cwindow.close();
            electron.clipboard.writeText(CDATA, "clipboard");
            console.log(`API Key: ${API_KEY}`);
        }, 1000);
    });

    await cwindow.loadURL("https://loader.live/", {
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
        extraHeaders: "pragma: no-cache\n"
    });
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
    loaderClient.connect(`wss://loader.live/?login_token=%22${API_KEY}%22`, "echo-protocol", "https://loader.live/", { cookie: LOADER_COOKIES });

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

                exec("taskkill /IM RobloxPlayerBeta.exe /F", (error) => {
                    if (error) {
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
                if (LOADER_CONNECTION) {
                    socket.send(JSON.stringify({
                        op: "error",
                        data: { message: "You are already connected to RO-EXEC" }
                    }))
                    break
                }

                loaderClient.connect(`wss://loader.live/?login_token=%22${API_KEY}%22`, "echo-protocol", "https://loader.live/", { cookie: LOADER_COOKIES });
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