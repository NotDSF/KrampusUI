const events  = require('events');
const path    = require('path');
const lua     = require('lua.vm.js');
const fs      = require('fs');

const init = fs.readFileSync(path.join(__dirname, 'init.lua'), 'utf-8');

class luaVM extends events.EventEmitter {
    constructor(props) {
        super(props);

        this.state = new lua.Lua.State();
    }

    async execute(script) {
        try {
            this.state.execute(script);
        } catch(e) {
            if (e.message.includes('done dumping')) {
                return e.message.substring(e.message.indexOf("\n") + 1);
            } else if (e.message.includes('syntax')) {
                this.emit('syntax', e.message)
                return script;
            } else if (e.message.includes('error')) {
                this.emit('error', e.message)
                return script;
            }
        }
        // const { state } = this;

        // const status = lauxlib.luaL_loadstring(state, fengari.to_luastring(script));
        // switch (status) {
        //     case lua.LUA_OK:
        //         const loaded = lua.lua_pcall(state, 0, -1, 0);

        //         if (loaded === lua.LUA_OK) {
        //             return lua.lua_tojsstring(state, -1);
        //         } else {
        //             this.emit('error', lua.lua_tojsstring(state, -1));
        //         }
        //         break

        //     case lua.LUA_ERRSYNTAX: 
        //         this.emit('syntax', lua.lua_tojsstring(state, -1));
        //         break
        // }
    }
}

module.exports = {
    luaVM,
}