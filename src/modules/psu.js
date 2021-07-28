const luamin = require('./luamin');
const path   = require('path');
const fs     = require('fs');

function removeCompoundOperators(src) {
    for (let match of src.matchAll(/(?<leftHand>\w)\+=/g)) { // Removes "platform lock" compound assignment operators
        let leftHand = match.groups.leftHand;
        src = src.replace(match[0], `${leftHand}=${leftHand}+`);
    }
    return src;
}

const inject = fs.readFileSync(path.join(__dirname, 'inject.lua'), 'utf-8');
async function grabPremium(state, src) {
    src = removeCompoundOperators(src);

    return await state.execute(inject + src);
}

async function constantDump(state, src) {
    let backup = src;
    try {
        src = luamin.Beautify(removeCompoundOperators(src), {
            RenameVariables: true
        })
    } catch(e) {
        state.emit('error', 'Failed to beautify');
        return backup;
    }


    let constantTable = (/else\n.*?(L_\d+_)\[.*?\] = nil\n.*?end;\n.*?end;/).exec(src);

    if (!constantTable) {
        state.emit('syntax', 'Unsupported obfuscator, try grabbing premium first');
        return backup
    }

    src = src.replace(constantTable[0], `${constantTable[0]}constantDump(${constantTable[1]})`)
    .replace(/\(.*?\.\.\.\) - 1\)/, "error('done dumping\\n' .. table.concat(_G.constants,'\\n'))");

    return await state.execute(inject + src);
}

module.exports = {
    removeCompoundOperators,
    grabPremium,
    constantDump
}