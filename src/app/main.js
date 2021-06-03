let webSocket = new WebSocket("ws://localhost:8080");
let editor;

require.config({ paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.20.0/min/vs" } });
require(["vs/editor/editor.main"], function () {
    editor = monaco.editor.create(document.getElementById("editor"), {
        value: "print(\"Hello World\")",
        language: "lua",
        theme: "vs-dark",
        wordWrap: "on",
        fontSize: "12px",
        automaticLayout: true
    });
});

function grabPremium() {
    webSocket.send(JSON.stringify({Operation: "grabPremium", Data: editor.getValue()}));
}

function constantDump() {
    webSocket.send(JSON.stringify({Operation: "constantDump", Data: editor.getValue()}));
}

function launchWebsite(url) {
    webSocket.send(JSON.stringify({Operation: "launchWebsite", Data: url}));
}

webSocket.onmessage = (msgData) => {
    let { data } = msgData;

    if (data === "Pong") return;

    editor.setValue(data);
}

let pingData = JSON.stringify({Operation: "ping"});
setTimeout(() => {
    webSocket.send(pingData);
}, 5000);