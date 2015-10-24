/*jshint node: true*/
/*jslint node: true*/
"use strict";
var getLines = function (text) {
    return text.split("\n");
};

var getLevel = function (line) {
    return line.match(/^\ */)[0].length;
};

var shiftTokenizer = function (text) {
    var lines = getLines(text);
    var tokensRaw = [];
    var level = -1;

    var i;
    var line;
    var newLevel;
    var leftShiftCount;
    for (i = 0; i < lines.length; i += 1) {
        line = lines[i];
        if (line !== "") {
            newLevel = getLevel(line);
            if (newLevel > level) {
                tokensRaw.push({
                    type: 'rs'
                });
                line = line.substr(level + 1);
            } else if (newLevel < level) {
                leftShiftCount = level - newLevel;
                tokensRaw.push({
                    type: 'ls',
                    body: leftShiftCount
                });
                line = line.substr(newLevel);
            } else {
                line = line.substr(newLevel);
            }
            tokensRaw.push({
                type: 'c',
                body: line
            });
            level = newLevel;
        }
    }
    return tokensRaw;
};

var asonTokenizer = function (shiftTokens) {
    var tokens = [];
    var contexts = ['m'];

    var i;
    var context;
    var locToken;
    var content;
    var firstChar;
    var lookAheadToken;
    var key;
    var firstSpacePosition;
    var value;
    var k;
    for (i = 0; i < shiftTokens.length; i += 1) {
        context = contexts[contexts.length - 1];
        locToken = shiftTokens[i];
        if (locToken.type === 'c') {
            content = locToken.body;
            if (context === 'm') {
                firstChar = content[0];
                if (firstChar === '.') {
                    lookAheadToken = shiftTokens[i + 1];
                    key = content.substr(1);
                    //if(key === "") throw "sequence key must not be empty"
                    if (lookAheadToken !== undefined && lookAheadToken.type === 'rs') {
                        tokens.push({
                            type: 'sk',
                            body: key
                        });
                        contexts.push('s');
                        i += 1;
                        tokens.push(lookAheadToken);
                    } else {
                        tokens.push({
                            type: 'ske',
                            body: key
                        });
                    }
                } else {
                    lookAheadToken = shiftTokens[i + 1];
                    if (lookAheadToken !== undefined && lookAheadToken.type === 'rs') {
                        //if(content == "") throw "map key must not be empty"
                        tokens.push({
                            type: 'mk',
                            body: content
                        });
                        contexts.push('m');
                        i += 1;
                        tokens.push(lookAheadToken);
                    } else {
                        firstSpacePosition = content.indexOf(" ");
                        if (firstSpacePosition !== -1) {
                            key = content.substring(0, firstSpacePosition);
                            value = content.substr(firstSpacePosition + 1);
                            //if(key === "") throw "value key must not be empty"
                            tokens.push({
                                type: 'k',
                                body: key
                            });
                            tokens.push({
                                type: 'v',
                                body: value
                            });
                        } else {
                            //if(content === "") throw "map key must not be empty"
                            tokens.push({
                                type: 'mke',
                                body: content
                            });
                        }
                    }
                }
            } else if (context === 's') {
                firstChar = content[0];
                if (firstChar === '.') {
                    key = content.substr(1);
                    tokens.push({
                        type: 's',
                        body: key
                    });
                    contexts.push('s');
                } else {
                    lookAheadToken = shiftTokens[i + 1];
                    if (lookAheadToken !== undefined && lookAheadToken.type === 'rs') {
                        //if(content === "") throw "key for anonymous map is not allowed";
                        tokens.push({
                            type: 'am'
                        });
                        contexts.push('m');
                        i += 1;
                        tokens.push(lookAheadToken);
                    } else {
                        tokens.push({
                            type: 'v',
                            body: content
                        });
                    }
                }
            }
        } else if (locToken.type === 'ls') {
            for (k = 0; k < locToken.body; k += 1) {
                contexts.pop();
            }
            tokens.push(locToken);
        } else {
            tokens.push(locToken);
        }
    }
    return tokens;
};

var generateJSON = function (asonTokens) {
    var output = "{";
    var contexts = ['m'];
    var lastToken;
    var comma = function () {
        switch (lastToken.type) {
        case 'v':
        case 'ske':
        case 'mke':
        case 'ls':
            output += ',';
            break;
        }
    };
    var i;
    var token;
    var count;
    var j;
    var context;
    for (i = 0; i < asonTokens.length; i += 1) {
        token = asonTokens[i];
        switch (token.type) {
        case 'ls':
            count = token.body;
            for (j = 0; j < count; j += 1) {
                context = contexts[contexts.length - 1];
                if (context === 'm') {
                    output += '}';
                } else if (context === 's') {
                    output += ']';
                }
                contexts.pop();
            }
            break;
        case 'v':
            comma();
            if (isNaN(token.body)) {
                output += '"' + token.body + '"';
            } else {
                output += token.body;
            }
            break;
        case 'am':
            comma();
            output += '{';
            contexts.push('m');
            break;
        case 's':
            comma();
            output += '[';
            contexts.push('s');
            break;
        case 'k':
            comma();
            output += '"' + token.body + '":';
            break;
        case 'mk':
            comma();
            output += '"' + token.body + '":{';
            contexts.push('m');
            break;
        case 'mke':
            comma();
            output += '"' + token.body + '":{}';
            break;
        case 'sk':
            comma();
            output += '"' + token.body + '":[';
            contexts.push('s');
            break;
        case 'ske':
            comma();
            output += '"' + token.body + '":[]';
            break;
        }
        lastToken = token;
    }

    while (contexts.length > 0) {
        context = contexts[contexts.length - 1];
        if (context === 'm') {
            output += '}';
        } else if (context === 's') {
            output += ']';
        }
        contexts.pop();
    }
    return output;
};

var asonToJson = function (ason) {
    var shiftTokens = shiftTokenizer(ason);
    var asonTokens = asonTokenizer(shiftTokens);
    return generateJSON(asonTokens);
};


exports.asonToJson = asonToJson;
exports.getLines = getLines;
exports.getLevel = getLevel;
exports.shiftTokenizer = shiftTokenizer;
exports.asonTokenizer = asonTokenizer;
exports.generateJSON = generateJSON;
