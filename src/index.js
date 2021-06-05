const { readFileSync, writeFileSync, unlinkSync } = require("fs");
const { exec } = require("child_process");
const { app, BrowserWindow } = require("electron");
const { Beautify } = require("./libs/luamin");
const ws = require("ws");
const injectCode = readFileSync("./src/libs/inject.lua", "utf-8");

function removeCompoundOperators(src) {
    for (let match of src.matchAll(/(?<leftHand>\w)\+=/g)) { // Removes "platform lock" compound assignment operators
        let leftHand = match.groups.leftHand;
        src = src.replace(match[0], `${leftHand}=${leftHand}+`);
    }
    return src;
}

function grabPremium(src) {
    return new Promise((resolve, reject) => {
        src = removeCompoundOperators(src);

        writeFileSync("tempFile.lua", injectCode+src);

        exec("lua tempFile.lua", (error, stdout, stderr) => {
            if (stderr) reject(stderr);

            resolve(removeCompoundOperators(stdout));
            unlinkSync("tempFile.lua");
        });
    });
}

function constantDump(src) {
    return new Promise((resolve, reject) => {
        src = Beautify(removeCompoundOperators(src), {
            RenameVariables: true
        });

        let constantTable = (/else\n.*?(L_\d+_)\[.*?\] = nil\n.*?end;\n.*?end;/).exec(src);

        if (!constantTable) return reject("-- Unsupported obfuscator, press grab then constant dump if this is psu premium.");

        src = src.replace(constantTable[0], `${constantTable[0]}print(constantDump(${constantTable[1]}))`);
        src = src.replace(/\(.*?\.\.\.\) - 1\)/, "error()"); // Stops this distaster rip my pc https://cdn.discordapp.com/attachments/822638850940731452/850078130957451264/unknown.png

        writeFileSync("tempFile.lua", injectCode+src);

        exec("lua tempFile.lua", (error, stdout, stderr) => {
            resolve(`--[[\n\tDumped using PSU Tools https://github.com/NotDSF/PSUTools\n\n\tEach constant table/pool represents a proto, the one with the fake constants is the main script proto since PSU only adds fake constants to the main proto. (lol)\n]]\n\n`+stdout);
            unlinkSync("tempFile.lua");
        });
    });
}

const wsServer = new ws.Server({
    port: 8080
});

console.log("test"); // ignore

wsServer.on("connection", async (webSocket) => {
    webSocket.on("message", async (message) => {
        let { Operation, Data } = JSON.parse(message);
        
        switch (Operation) {
            case "grabPremium": {
                try {
                    webSocket.send(await grabPremium(Data));
                } catch (er) {
                    webSocket.send(er);
                }
                break;
            }
            case "constantDump": {
                try {
                    webSocket.send(await constantDump(Data));
                } catch (er) {
                    webSocket.send(er);
                }
                break;
            }
            case "launchWebsite": {
                exec(`start ${Data}`);
                break;
            }
            case "ping": {
                webSocket.send("Pong");
                break;
            }
        }
    });
});

app.on("ready", () => {
    const electronWindow = new BrowserWindow({
        width: 900,
        height: 950,
        icon: "./src/app/icon.png"
    });

    electronWindow.setResizable(false);
    electronWindow.setMenuBarVisibility(false);
    electronWindow.loadFile("./src/app/index.html");
});

app.on("window-all-closed", () => app.quit());
