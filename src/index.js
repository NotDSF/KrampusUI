const electron = require('electron');
const discord  = require('./modules/discord');
const express  = require('express');
const luamin   = require('./modules/luamin');
const open     = require('open');
const path     = require('path');
const lua      = require('./lua');
const psu      = require('./modules/psu');
const fs       = require('fs');
const ws       = require('ws');

const http = express();
http.use(express.static(path.join(__dirname, 'dist')));
http.listen(42773);

let window;
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

    // window.webContents.openDevTools({mode: 'undocked'});
}

const app = electron.app;

app.whenReady().then(createWindow);

const server = new ws.Server({
    port: 42772
})

server.on('connection', socket => {
    const vm = new lua.luaVM();

    vm.on('error', (message) => {
        socket.send(JSON.stringify({
            op: 'error',
            data: {message}
        }))
    })
    vm.on('syntax', (message) => {
        socket.send(JSON.stringify({
            op: 'syntax',
            data: {message}
        }))
    })
    socket.on('message', async message => {
        let output;
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

            case 'openFile':
                const files = await electron.dialog.showOpenDialogSync(window, {properties: ['openFile']});
                if (!files) return;

                const content = fs.readFileSync(files[0], 'utf-8');
                socket.send(JSON.stringify({
                    op: 'setEditor',
                    data: {value: content}
                }))
                break

            case 'grabPremium':
                output = await psu.grabPremium(vm, data.source);

                socket.send(JSON.stringify({
                    op: 'setEditor',
                    data: {value: output}
                }))
                break

            case 'constantDump':
                output = await psu.constantDump(vm, data.source);

                socket.send(JSON.stringify({
                    op: 'setEditor',
                    data: {value: output}
                }))
                break

            case 'joinDiscord':
                discord.join('DEzFrPu6pY');
                break

            case 'buyLuraph':
                open('https://lura.ph/');
                break

            case 'beautify':
                output = await luamin.Beautify(data.source, data.options);

                socket.send(JSON.stringify({
                    op: 'setEditor',
                    data: {value: output}
                }))
                break

            case 'minify':
                output = await luamin.Minify(data.source, data.options);

                socket.send(JSON.stringify({
                    op: 'setEditor',
                    data: {value: output}
                }))
                break
        }
    })
})