/*jshint node: true*/
/*jslint node: true*/
"use strict";

//-------------------------------COMMON
/**
Used to match strings that could be
interpreted as primitives but are escaped
to enforce string representation
*/
var primitiveEscapeSequenceRegEx = /^(\\*)(null|true|false|-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?)$/;

/**
matches map keys that have an empty map as value
*/
var mapKeyEmptyMapRegEx = /^(\\*)-.*$/;

/**
matches map keys that have an empty sequence as value
*/
var mapKeyEmptySequenceRegEx = /^(\\*)\..*$/;

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

/**
Converts primitive values to string.
Infinity and NaN are converted to "null".
If argument is not primitive, method returns null.
*/
var convertPrimitiveToString = function(value) {
        //Treat INFINITY or NaN as null
    //"NaN, and only NaN, will compare unequal to itself" -> hubelibubeli
    if(value === Infinity || value !== value) {
        return "null";
    }
    //JSON.stringify interprets INFINITY and NaN as null. if value of key is undefined, the key is ignored.
    //TODO also ignore key if value is undefined (has to be checked elsewhere)
    
    //Convert primitives to string
    if(value === null || value === true || value === false || typeof value === "number") {
        return "" + value;
    }
    
    return null;
};
//-------------------------------COMMON END

//-------------------------------ESCAPING
/**
Converts a string from json. The chars of the resulting string are not escaped
*/
var unescapeFromJson = function(text) {
    //map escape sequence to char
    var specialMapping = {
        "\\\"":"\"",
        "\\\\":"\\",
        "\\/":"/",
        "\\b":"\b",
        "\\f":"\f",
        "\\n":"\n",
        "\\r":"\r",
        "\\t":"\t",
    };

    //output
    var unescapedString = "";
    
    //search index
    var escapeSequenceIndex = -1;
    
    while(true) {
        //find escape sequence
        var newIndex = text.indexOf("\\", escapeSequenceIndex);
        
        //no action if no escape sequence found
        if(newIndex == -1) break;
        
        //add text from previous index to new index (exclusive) to unescapedString
        unescapedString+=text.substring(escapeSequenceIndex,newIndex);
        
        //work now with new index
        escapeSequenceIndex = newIndex;
        
        //get char from mapping if possible
        var escapeSequence = text.substr(escapeSequenceIndex,2);
        var specialChar = specialMapping[escapeSequence];
        
        //if char is from mapping
        if(specialChar !== undefined) {
            //Add it to unescapedString
            unescapedString+=specialChar;
            //next search begins at escapeSequenceIndex plus 2
            escapeSequenceIndex+=2;
        } else {
            //Check if it is a code point escape sequence
            var matchResult = text.substr(escapeSequenceIndex,6).match(/^\\u([0-9A-Fa-f]{4})$/);
            if(matchResult !== null) {
                //Add the character the code point represents to unescapedString
                var codePoint = matchResult[1];
                unescapedString+=String.fromCharCode(parseInt(codePoint, 16));
                 escapeSequenceIndex+=6;
            } else {
                //otherwise, just ignore the backslash
                escapeSequenceIndex+=1;
            }
        }
    }
    
    //add the rest to unescapedString
    unescapedString+=text.substring(escapeSequenceIndex);
    return unescapedString;
};

/**
Converts a normal string. The chars of the resulting string are json compliant escaped
*/
var escapeToJson = function(text, ignoreQuotationMark) {
    var escapedString = "";
    
    //map char to escape sequence
    var specialMapping = {
        "\"":"\\\"",
        "\\":"\\\\",
        // "/":"\\/",
        "\b":"\\b",
        "\f":"\\f",
        "\n":"\\n",
        "\r":"\\r",
        "\t":"\\t",
    };
    
    if(ignoreQuotationMark) {
        specialMapping["\""] = undefined;
    }
    
    var index = -1;
    
    for(var i = 0;i<text.length;i++) {
        if(specialMapping[text[i]] !== undefined) {
            escapedString+=specialMapping[text[i]];
        } else if(/[\u0000-\u0007\u000B\u000E-\u001F]/.test(text[i])) {
            var codePoint = text[i].codePointAt(0);
            var hex = ("0000"+codePoint.toString(16)).slice(-4);
            escapedString+= "\\u" + hex
        } else {
            escapedString+=text[i];
        }
    }
    
    return escapedString;
}



/**
Converts a normal string to an ason key string.
Json escaping is applied.
Furthermore, spaces are escaped.
*/
var convertStringToAsonKeyString = function(str) {
    return escapeToJson(str).replace(/ /g,"\\ ");
};

/**
Escaping allows to depict null, true, false and numbers (defined in ecma-404) as strings.
Without escaping, they are converted to json primitives.
The difference is that the strings have " chars around it
while primitives do not.
This method is called when a string is converted to a json value.
*/
//deprecated because conversion is now done over unescaped javascript strings. This method may be used to convert directly from ason strings to json strings though.
var convertStringToJsonValueFormat = function(str) {
    var matchResult = str.match(/^(\\*)(null|true|false|-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?)$/);
    var unescapedString
    if(matchResult !== null) {
        var backslashes = matchResult[1];
        var str = matchResult[2];
        
        if(backslashes.length === 0) {
            //its a primitive. no " chars
            return str;
        } else {
            //remove one backslash and at " chars around it
            return '"' + backslashes.slice(1) + str + '"';
        }
    }
    return '"' + escapeToJson(str) + '"';
}

var convertJsonValueFormatToObjectValue = function(str) {
    //must probably be implemented when json will be parsed without external library
};

/**
Unescapes the spaces in a ason key and applies 
then json unescaping rules. Result will be a normal
string. All chars will be unescaped.
For Ason values only the unescapeFromJson method is needed.
*/
var convertAsonKeyToObjectValue = function(asonKey) {
    return unescapeFromJson(asonKey.replace(/\\ /g," "));
};

/**
Converts an ASON value to an object value
that can be a primitive
*/
var convertAsonValueToObjectValue = function(str) {
    var matchResult = str.match(primitiveEscapeSequenceRegEx);
    var unescapedString
    if(matchResult !== null) {
        var backslashes = matchResult[1];
        var str = matchResult[2];
        
        if(backslashes.length === 0) {
            //its a primitive. 
            if(str === "null") return null;
            else if(str === "true") return true;
            else if(str === "false") return false;
            else return parseFloat(str); //converts number with js standard parseFloat
        } else {
            //remove one backslash and at " chars around it
            return backslashes.slice(1) + str;
        }
    }
    return unescapeFromJson(str);
}

/**
Converts an object value to a string that represents
a Json value. In Json, strings have surrounding " chars 
while primitives do not. For keys, the escapeToJson method
with manually adding " chars can be used.
*/
var convertObjectValueToJsonValueFormat = function(value) {
    //Convert primitives to string
    var str = convertPrimitiveToString(value);
    if(str !== null) return str;
    
    //otherwise, escape and surround with " chars
    return '"' + escapeToJson(value) + '"';
}

/**
Converts a value (either string, true, false, number or null) 
from an object to an ason value string.
Applies json escaping when value is of type string, but does not escape quotation mark.
If not a string, converts value into string representation.
*/
var convertObjectValueToAsonValueString = function(value) {
    //Convert primitives to string
    var str = convertPrimitiveToString(value);
    if(str !== null) return str;
    
    //escaping needed for string representation of primitive types
    var matchResult = value.match(primitiveEscapeSequenceRegEx);
    if(matchResult !== null) {
        //just add a backslash in front
        return "\\" + matchResult[0];
    }
    
    return escapeToJson(value, true);
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
            //TODO throw exception if ason tokens contain unescaped special characters: 005C, 0000-001F must be escaped.
            if (context === 'm') {
                lookAheadToken = shiftTokens[i + 1];
                if (lookAheadToken !== undefined && lookAheadToken.type === 'rs') {
                    if(strict && content === "") throw "previous line: map key must not be empty";
                    if(strict && content.indexOf(" ") !== -1) throw "previous line: map key must not contain spaces";
                    if (content[0] === '.') {
                        key = content.substr(1);
                        tokens.push({
                            type: 'sk',
                            body: unescapeFromJson(key)
                        });
                        contexts.push('s');
                    } else {
                        tokens.push({
                            type: 'mk',
                            body: unescapeFromJson(content)
                        });
                        contexts.push('m');
                    }
                    i += 1;
                    tokens.push(lookAheadToken);
                } else {
                    if(mapKeyEmptySequenceRegEx.test(content)){
                        tokens.push({
                            type: 'ske',
                            body: unescapeFromJson(content.substr(1))
                        })
                    } else if(mapKeyEmptySequenceRegEx.test(content)) {
                        tokens.push({
                            type: 'mke',
                            body: unescapeFromJson(content.substr(1))
                        })
                    } else {
                        //ignore escaped spaces
                        firstSpacePosition = indexOfFirstUnescapedSpace(content);
                        if(strict && firstSpacePosition === -1) throw "expected key and value separated by unescaped space or indentation on next line";
                        key = content.substring(0, firstSpacePosition);
                        value = content.substr(firstSpacePosition + 1);
                        if(strict && key === "") throw "value key must not be empty";
                        if(strict && value === "") throw "value must not be empty";
                        tokens.push({
                            type: 'k',
                            body: convertAsonKeyToObjectValue(key)
                        });
                        tokens.push({
                            type: 'v',
                            body: convertAsonValueToObjectValue(value)
                        });
                    }
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
                    if(content[0] === '.') {
                        if(strict && content.length > 1) throw "in a sequence, an empty sequence is depicted with only one . character";
                        tokens.push({
                            type: 'se',
                        });
                    } else if(content[0] === '-') {
                        if(strict && content.length > 1) throw "in a sequence, an empty map is depicted with only one - character";
                        tokens.push({
                            type: 'me',
                        });
                    } else {
                        tokens.push({
                            type: 'v',
                            body: convertAsonValueToObjectValue(content)
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
        case 'se':
        case 'me':
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
            output += convertObjectValueToJsonValueFormat(token.body);
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
            output += '"' + escapeToJson(token.body) + '":';
            break;
        case 'mk':
            comma();
            if(prettyPrint) output+=levelToSpace(contexts.length-1);
            output += '"' + escapeToJson(token.body) + '":{';
            contexts.push('m');
            if(prettyPrint) output+='\n';
            break;
        case 'mke':
            comma();
            if(prettyPrint) output+=levelToSpace(contexts.length-1);
            output += '"' + escapeToJson(token.body) + '":{}';
            if(prettyPrint) output+='\n';
            break;
        case 'sk':
            comma();
            if(prettyPrint) output+=levelToSpace(contexts.length-1);
            output += '"' + escapeToJson(token.body) + '":[';
            contexts.push('s');
            if(prettyPrint) output+='\n';
            break;
        case 'ske':
            comma();
            if(prettyPrint) output+=levelToSpace(contexts.length-1);
            output += '"' + escapeToJson(token.body) + '":[]';
            break;
        case 'se':
            comma();
            if(prettyPrint) output+=levelToSpace(contexts.length-1);
            output += '[]';
            break;
        case 'me':
            comma();
            if(prettyPrint) output+=levelToSpace(contexts.length-1);
            output += '{}';
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
                output += "." + escapeToJson(key) + "\n" + arrayToAson(value, level + 1);
            } else if(value === Object(value)) { //warn: array is also an object
                output += escapeToJson(key) + "\n" + objToAson(value, level + 1);
            } else {
                //Use escaping. Turn spaces in keys into \<space>
                output += convertStringToAsonKeyString(key) + " " + convertObjectValueToAsonValueString(value) + "\n";
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
            output += convertObjectValueToAsonValueString(el) + "\n";
        }
    }
    //if(output[output.length-1] === "\n") output = output.slice(0,output.length-1);
    return output;
};
//-----------------------------JS Object to ASON END

//-----------------------------CONVERSIONS
/**
Converts a JS object to Ason
*/
var stringify = function(o) {
    var output = "";
    var level = 0;
    if(Array.isArray(o)){
        output += arrayToAson(o, level);
    } else if(o === Object(o)) {
        output += "-\n";
        output += objToAson(o, level + 1);
    } else {
        output += convertObjectValueToAsonValueString(o);
    }
    if(output[output.length-1] === "\n") output = output.slice(0,output.length-1);
    return output;
};

var asonToJson = function (ason,prettyPrint,strict) {
    var shiftTokens = shiftTokenizer(ason,strict);
    var asonTokens = asonTokenizer(shiftTokens,strict);
    return generateJSON(asonTokens,prettyPrint);
};

var jsonToAson = function(json) {
    //TODO direct conversion json ason?
    var o = JSON.parse(json);
    return stringify(o);
};

/**
Converts ASON to a JS Object
*/
var parse = function(str) {
    var tokens = asonTokenizer(shiftTokenizer(str,false),false);
    var nRootChildren = 0;
    var stack = [[]];
    for(var currentIndex = 0; currentIndex < tokens.length; currentIndex++){
        if(tokens[currentIndex].type === 'k') {
            stack[stack.length-1][tokens[currentIndex].body] = tokens[++currentIndex].body;
        } else if(tokens[currentIndex].type === 'v') {
            if(stack.length === 1) nRootChildren++;
            stack[stack.length-1].push(tokens[currentIndex].body);
        } else if(tokens[currentIndex].type === 'mk') {
            stack.push(stack[stack.length-1][tokens[currentIndex].body] = {});
        } else if(tokens[currentIndex].type === 'sk') {
            stack.push(stack[stack.length-1][tokens[currentIndex].body] = []);
        } else if(tokens[currentIndex].type === 'ls') {
            for(var i = 0; i < tokens[currentIndex].body; i++) {
                stack.pop();
            }
        } else if(tokens[currentIndex].type === 'am') {
            if(stack.length === 1) nRootChildren++;
            var o = {};
            stack[stack.length-1].push(o);
            stack.push(o);
        } else if(tokens[currentIndex].type === 's') {
            if(stack.length === 1) nRootChildren++;
            var a = [];
            stack[stack.length-1].push(a);
            stack.push(a);
        }
    }
    if(nRootChildren === 1) return stack[0][0];
    return stack[0];
};
//-----------------------------CONVERSIONS END

exports.asonToJson = asonToJson;
exports.getLines = getLines;
exports.getLevel = getLevel;
exports.shiftTokenizer = shiftTokenizer;
exports.asonTokenizer = asonTokenizer;
exports.generateJSON = generateJSON;
exports.jsonToAson = jsonToAson;
exports.stringify = stringify;
exports.parse = parse;

exports.unescapeFromJson = unescapeFromJson;
exports.convertAsonValueToObjectValue = convertAsonValueToObjectValue;
exports.convertObjectValueToJsonValueFormat = convertObjectValueToJsonValueFormat;
