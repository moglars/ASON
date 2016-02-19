/*jshint node: true*/
/*jslint node: true*/
"use strict";

//-------------------------------COMMON
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

var indexOfFirstUnescapedSpace = function(text) {
    return text.replace(/\\ /g,"__").indexOf(" ");
};

var levelToSpace = function(level) {
    var space = "";
    for(var i = 0; i < level;i++) {
        space += " ";
    }
    return space;
};
//-------------------------------COMMON END

//-------------------------------ESCAPING
var unescapeSpace = function(text) {
    return text.replace(/\\ /g," ");
};

/**
To write a line feed in a ason key or value,
write the escape sequence \n.
This method converts the escape sequence back 
to a line feed character.
*/
var unescapeLineFeed = function(text) {
    return text.replace("\\n","\n"); 
}

/**
As of ecma-404 specification of JSON, the quotation mark (U+0022),
the reverse solidus (U+005C) and the control characters U+0000 to 
U+001F must be escaped.
See following list for used two-character escape sequences:
\" quotation mark 
\\ reverse solidus
\b backspace
\f form feed
\n line feed
\r carriage return
\t character tabulation
The other control characters are escaped with \u<code point> where <code point>
is a hexadecimal representation of the code point.
*/
var escapeSpecialJsonChars = function(text) {
    text = text.replace(/\\([^n])/g,function(match,g1){return "\\\\" + g1}) //replaces \ with two of them, ignores \n
    text = text.replace(/"/g,"\\\""); //replaces " with \"
    text = text.replace(/[\b]/g,"\\b"); //replaces backspace with \b
    text = text.replace(/[\f]/g,"\\f"); //replaces backspace with \f
    
    text = text.replace(/[\n]/g,"\\n"); //replaces backspace with \n
    
    text = text.replace(/[\r]/g,"\\r"); //replaces backspace with \r
    text = text.replace(/[\t]/g,"\\t"); //replaces backspace with \t
    
    //replaces the control characters with escape sequence
    return text.replace(/[\u0000-\u0007\u000B\u000E-\u001F]/g,function(match) {
        var codePoint = match.codePointAt(0);
        var hex = ("0000"+codePoint.toString(16)).slice(-4);
        return "\\u" + hex;
    });
};

/**
Escapes line feed characters coming from json to \n in ason
*/
var escapeSpecialAsonChars = function(text) {
    return (""+text).replace("\n","\\n");
};

var escapeJsonPrimitiveStrings = function(value) {
    if(value === "null" || value === "true" || value === "false") {
        return "\\" + value;
    }
    return value;
};
//-------------------------------ESCAPING END

//--------------------------------TOKENIZING
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
var shiftTokenizer = function (text,strict) {
    var lines = getLines(text);
    var tokensRaw = [];
    var level = -1;

    var i;
    var line;
    var newLevel;
    var leftShiftCount;
    for (i = 0; i < lines.length; i += 1) {
        line = lines[i];
        if(strict && line.trim() === "") throw "line must not be empty";
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
var asonTokenizer = function (shiftTokens, strict) {
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
            if(strict && content[content.length-1] === " " ) throw "no whitespace at the end of the line allowed";
			else if(strict && content[content.length-1] === "\r" ) throw "carriage returns not allowed for line breaks";
            else if(strict && content.indexOf("\t") !== -1) throw "no tabs allowed";
            if (context === 'm') {
                lookAheadToken = shiftTokens[i + 1];
                if (lookAheadToken !== undefined && lookAheadToken.type === 'rs') {
                    if(strict && content === "") throw "previous line: map key must not be empty";
                    if(strict && content.indexOf(" ") !== -1) throw "previous line: map key must not contain spaces";
                    if (content[0] === '.') {
                        key = content.substr(1);
                        tokens.push({
                            type: 'sk',
                            body: key
                        });
                        contexts.push('s');
                    } else {
                        tokens.push({
                            type: 'mk',
                            body: content
                        });
                        contexts.push('m');
                    }
                    i += 1;
                    tokens.push(lookAheadToken);
                } else {
                    //ignore escaped spaces
                    firstSpacePosition = indexOfFirstUnescapedSpace(content);
                    if(strict && firstSpacePosition === -1) throw "expected key and value separated by unescaped space or indentation on next line";
                    key = content.substring(0, firstSpacePosition);
                    key = unescapeSpace(key);
                    value = content.substr(firstSpacePosition + 1);
                    if(strict && key === "") throw "value key must not be empty";
                    if(strict && value === "") throw "value must not be empty";
                    tokens.push({
                        type: 'k',
                        body: key
                    });
                    tokens.push({
                        type: 'v',
                        body: value
                    });
                }
            } else if (context === 's') {
                lookAheadToken = shiftTokens[i + 1];
                if (lookAheadToken !== undefined && lookAheadToken.type === 'rs') {
                    if(content === '.') {
                        tokens.push({
                            type: 's'
                        });
                        contexts.push('s');
                    } else {
                        if(strict && content !== '-') throw "in a sequence, indentation is introduced by a - or . character on previous line";
                        tokens.push({
                            type: 'am'
                        });
                        contexts.push('m');
                    }
                    i += 1;
                    tokens.push(lookAheadToken);
                } else {
                    tokens.push({
                        type: 'v',
                        body: content
                    });
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
//--------------------------------TOKENIZING END

//--------------------------------TOKENS TO JSON
/**
Interprets ason tokens and generates JSON.
**/
var generateJSON = function (asonTokens,prettyPrint) {
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
            if(prettyPrint) output+='\n';
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
            if(prettyPrint && lastToken.type !== 'k') output+=levelToSpace(contexts.length-1);
            if(token.body === "null" || token.body === "true" || token.body === "false") {
                output += token.body;
            } else if(token.body === "\\null" || token.body === "\\true" || token.body === "\\false") {
                output += '"' + token.body.slice(1) + '"';
            } else if (isNaN(token.body) || token.body === "") {
                output += '"' + escapeSpecialJsonChars(token.body) + '"';
            } else {
                output += token.body;
            }
            break;
        case 'am':
            if(contexts.length === 1) countMapOrValueElements ++;
            comma();
            if(prettyPrint) output+=levelToSpace(contexts.length-1);
            output += '{';
            if(prettyPrint) output+='\n';
            contexts.push('m');
            break;
        case 's':
            if(contexts.length === 1) countSequenceElements ++;
            comma();
            if(prettyPrint) output+=levelToSpace(contexts.length-1);
            output += '[';
            if(prettyPrint) output+='\n';
            contexts.push('s');
            break;
        case 'k':
            comma();
            if(prettyPrint) output+=levelToSpace(contexts.length-1);
            output += '"' + escapeSpecialJsonChars(token.body) + '":';
            break;
        case 'mk':
            comma();
            if(prettyPrint) output+=levelToSpace(contexts.length-1);
            output += '"' + escapeSpecialJsonChars(token.body) + '":{';
            contexts.push('m');
            if(prettyPrint) output+='\n';
            break;
        case 'mke':
            comma();
            output += '"' + escapeSpecialJsonChars(token.body) + '":{}';
            if(prettyPrint) output+='\n';
            break;
        case 'sk':
            comma();
            if(prettyPrint) output+=levelToSpace(contexts.length-1);
            output += '"' + escapeSpecialJsonChars(token.body) + '":[';
            contexts.push('s');
            if(prettyPrint) output+='\n';
            break;
        case 'ske':
            comma();
            output += '"' + escapeSpecialJsonChars(token.body) + '":[]';
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
//--------------------------------TOKENS TO JSON END



//-----------------------------JS Object to ASON
var objToAson = function(o, level) {
    var output = "";
    var hasKeys = false;
    for(var key in o) {
        if(o.hasOwnProperty(key)){
            hasKeys = true;
            output += levelToSpace(level);

            var value = o[key];
            if(Array.isArray(value)) {
                output += "." + escapeSpecialAsonChars(key) + "\n" + arrayToAson(value, level + 1);
            } else if(value === Object(value)) { //warn: array is also an object
                output += escapeSpecialAsonChars(key) + "\n" + objToAson(value, level + 1);
            } else {
                //Use escaping. Turn spaces in keys into \<space>
                output += escapeSpecialAsonChars(key.replace(/ /g,"\\ ")) + " " + escapeSpecialAsonChars(escapeJsonPrimitiveStrings(value)) + "\n";
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
            output += escapeSpecialAsonChars(escapeJsonPrimitiveStrings(el)) + "\n";
        }
    }
    //if(output[output.length-1] === "\n") output = output.slice(0,output.length-1);
    return output;
};
//-----------------------------JS Object to ASON END

//-----------------------------CONVERSIONS
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
        output += escapeSpecialAsonChars(escapeJsonPrimitiveStrings(o));
    }
    if(output[output.length-1] === "\n") output = output.slice(0,output.length-1);
    return output;
};

var asonToJson = function (ason,prettyPrint,strict) {
    var shiftTokens = shiftTokenizer(ason,strict);
    var asonTokens = asonTokenizer(shiftTokens,strict);
    return generateJSON(asonTokens,prettyPrint);
};

//TODO parse(text) ASON TO OBJECT

//TODO stringify(object) OBJECT TO ASON
//-----------------------------CONVERSIONS END

exports.asonToJson = asonToJson;
exports.getLines = getLines;
exports.getLevel = getLevel;
exports.shiftTokenizer = shiftTokenizer;
exports.asonTokenizer = asonTokenizer;
exports.generateJSON = generateJSON;
exports.jsonToAson = jsonToAson;
