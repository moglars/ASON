/*jshint node: true*/
/*jslint node: true*/
"use strict";

/**
Splits a string at newLine characters and
returns an array of lines
**/
var getLines = function (text) {
    return text.split("\n");
};

/**
Counts the space characters in front of a string
**/
var getLevel = function (line) {
    return line.match(/^\ */)[0].length;
};

/**
Analyses a string and creates tokens. Possible types:
- rs (right shift)
- ls (left shift)
- c (content)
A token is an object with at least an attribute type. 
It stores the type as a string (rs, ls or c).
The token can have a body attribute with additional information:
- ls tokens store the number of levels to decrease
- c tokens store the value of the content
The tokens describe the level of values or in other words:
The hierarchical structure of data.
This method returns an array of tokens of type rs, ls or c.
**/
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

/**
This method takes the output of the method shiftTokenizer as
an argument and analyses it further to create more specialized tokens.
There are two different contexts: m (map) and s (sequence).
Start context is m. After a c token (it's a line), a rs token can introduce
a new context that is pushed into a stack. A ls token pops contexts
off a stack. Depending on the context, c tokens are interpreted differently.
If one condition is met, the others are ignored.
Map-Context:
- A line that starts with character . and is followed by rs 
  creates sk (sequence key) token. Push sequence context into stack.
- ske is created when the line starting with . character is not followed by rs.
  It depicts an empty sequence.
- A line followed by rs creates mk (map key) token. Push map context into stack.
- If there is a space character in the line,
  split at first space and create  k (key) and v (value) tokens
- Otherwise, create mke (map key element) token, depicting an empty map.
Sequence-Context:
- A line starts with a . character. Create s (sequence) token.
- line is followed by rs. Create am (anonymous map) token. Push map context into stack.
- Otherwise, create v (value) token, depicting an element of the sequence.
**/
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

/**
Interprets ason tokens and generates JSON.
**/
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
            if (isNaN(token.body) || token.body === "") {
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
