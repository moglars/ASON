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
    var contexts = ['s'];

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
            if(content[content.length-1] === " " ) throw "no whitespace at the end of the line allowed";
			else if(content[content.length-1] === "\r" ) throw "carriage returns not allowed for line breaks";
            if (context === 'm') {
                firstChar = content[0];
                if (firstChar === '.') {
                    lookAheadToken = shiftTokens[i + 1];
                    key = content.substr(1);
                    if(key === "") throw "sequence key must not be empty";
                    if (lookAheadToken !== undefined && lookAheadToken.type === 'rs') {
                        tokens.push({
                            type: 'sk',
                            body: key
                        });
                        contexts.push('s');
                        i += 1;
                        tokens.push(lookAheadToken);
                    } else {
                        throw "sequence must not be empty";
                       /*  tokens.push({
                            type: 'ske',
                            body: key
                        }); */
                    }
                } else {
                    lookAheadToken = shiftTokens[i + 1];
                    if (lookAheadToken !== undefined && lookAheadToken.type === 'rs') {
                        if(content == "") throw "map key must not be empty";
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
                            if(key === "") throw "value key must not be empty";
                            if(value === "") throw "value must not be empty";
                            tokens.push({
                                type: 'k',
                                body: key
                            });
                            tokens.push({
                                type: 'v',
                                body: value
                            });
                        } else {
                            throw "key and value expected";
                            // if(content === "") throw "map key must not be empty"
                            /* tokens.push({
                                type: 'mke',
                                body: content
                            }); */
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
                        if(content !== "-") throw "anonymous map must be introduced with a '-' character";
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
    var countMapOrValueElements = 0; //json compatibility. remove sequence if only one map or one value in root sequence and no other sequence element
    var countSequenceElements = 0;
    
    var contexts = ['s'];
    var output;

    output = "[";

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
            if(contexts.length === 1) countMapOrValueElements ++;
            comma();
            if (isNaN(token.body) || token.body === "") {
                output += '"' + token.body + '"';
            } else {
                output += token.body;
            }
            break;
        case 'am':
            if(contexts.length === 1) countMapOrValueElements ++;
            comma();
            output += '{';
            contexts.push('m');
            break;
        case 's':
            if(contexts.length === 1) countSequenceElements ++;
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
    if(countMapOrValueElements === 1 && countSequenceElements === 0) output = output.slice(1,output.length-1);
    return output;
};

var asonToJson = function (ason) {
    var shiftTokens = shiftTokenizer(ason);
    var asonTokens = asonTokenizer(shiftTokens);
    return generateJSON(asonTokens);
};

var levelToSpace = function(level) {
    var space = "";
    for(var i = 0; i < level;i++) {
        space += " ";
    }
    return space;
};

var objToAson = function(o, level) {
    var output = "";
    var hasKeys = false;
    for(var key in o) {
        if(o.hasOwnProperty(key)){
            hasKeys = true;
            output += levelToSpace(level);
            
            //This makes ASON not 100% compatible with JSON:
            var keyC = key.replace(" ","_");
            
            var value = o[key];
            if(Array.isArray(value)) {
                output += "." + keyC + "\n" + arrayToAson(value, level + 1);
            } else if(value === Object(value)) { //warn: array is also an object
                output += keyC + "\n" + objToAson(value, level + 1);
            } else {
                output += keyC + " " + value + "\n";
            }
        }
    }
    // if(!hasKeys) output
    //if(output[output.length-1] === "\n") output = output.slice(0,output.length-1);
    return output;
};

var arrayToAson = function(arr, level) {
    var output = "";
    for(var i = 0;i< arr.length;i++) {
        output += levelToSpace(level);
        var el = arr[i];
        if(Array.isArray(el)){
            output += ".\n";          
            output += arrayToAson(el, level + 1);
        } else if(el === Object(el)) {
            output += "-\n";
            output += objToAson(el, level + 1);
        } else {
            output += el + "\n";
        }
    }
    //if(output[output.length-1] === "\n") output = output.slice(0,output.length-1);
    return output;
};

var jsonToAson = function(json) {
    var o = JSON.parse(json);
    var output = "";
    var level = 0;
    if(Array.isArray(o)){  
        // output += ".\n";
        // output += arrayToAson(o, level + 1);
        output += arrayToAson(o, level);
    } else if(o === Object(o)) {
        output += "-\n";
        output += objToAson(o, level + 1);
    } else {
        output += o;
    }
    if(output[output.length-1] === "\n") output = output.slice(0,output.length-1);
    return output;
};


exports.asonToJson = asonToJson;
exports.getLines = getLines;
exports.getLevel = getLevel;
exports.shiftTokenizer = shiftTokenizer;
exports.asonTokenizer = asonTokenizer;
exports.generateJSON = generateJSON;
exports.jsonToAson = jsonToAson;
