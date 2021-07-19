let webSocket = new WebSocket("ws://localhost:8080");

require.config({ paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.20.0/min/vs" } });
require(["vs/editor/editor.main"], function () {
    window.editor = monaco.editor.create(document.getElementById("editor"), {
        value: "print(\"Hello World\")",
        language: "lua",
        theme: "vs-dark",
        wordWrap: "on",
        fontSize: "12px",
        automaticLayout: true
    });
});

function grabPremium() {
    webSocket.send(JSON.stringify({Operation: "grabPremium", Data: window.editor.getValue()}));
}

function constantDump() {
    webSocket.send(JSON.stringify({Operation: "constantDump", Data: window.editor.getValue()}));
}

function launchWebsite(url) {
    webSocket.send(JSON.stringify({Operation: "launchWebsite", Data: url}));
}

webSocket.onmessage = (msgData) => {
    let { Operation, Data } = JSON.parse(msgData.data);

    switch (Operation) {
        case "text": 
            return window.editor.setValue(Data);
        case "updateCheck": {
            if (Data) {
                window.promptedUpdate = true;
                if (confirm("Update available, would you like to download it?")) {
                    webSocket.send(JSON.stringify({Operation: "updateClient"}));
                }
            }
        }
    }
}

/*
let cachedData = JSON.stringify({Operation: "checkUpdate"});
setInterval(() => {
    if (!window.promptedUpdate) {
       webSocket.send(cachedData);
    }
}, 10000);
*/