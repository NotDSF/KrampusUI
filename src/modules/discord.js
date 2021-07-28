const http = require('superagent');
const open = require('open');

async function getPort() {
    const body = JSON.stringify({
        code: 0,
        message: 'Not Found'
    })

    for (port = 6463; port < 6472; port++) {
        try {
            await http.get(`http://localhost:${port}`);
        } catch(e) {
            let res = e.response;

            if (res && res.statusCode == 404 && res.text == body) {
                return port;
            }
        }
    }
}

async function join(code) {
    const port = await getPort();

    if (port) {
        const res = await http
            .post(`http://localhost:${port}/rpc?v=1`)
            .set('Content-Type', 'application/json')
            .set('origin', 'https://discord.com')
            .send({nonce: 'balls', cmd: 'INVITE_BROWSER', args: {code}})
    
    } else {
        open(`https://discord.gg/${code}`);
    }

}   

module.exports = {
    join
}