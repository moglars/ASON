ason = require("./ASON.js");

testData = [
    ['string, one element','value','"value"'],
    ['number, one element','5','5'],
    ['boolean, one element','true','true'],
    ['boolean escaped, one element','\\true','"true"'],
    ['anonymous map','-\n key value','{"key":"value"}'],
    ['anonymous map pretty print','-\n key value','{\n "key":"value"}', true],
    ['list','el1\nel2','["el1","el2"]'],
    ['list pretty print','el1\nel2','["el1",\n"el2"]',true],
    ['number list','1\n2\n3\n4\n5','[1,2,3,4,5]'],
    ['number list pp','1\n2\n3\n4\n5','[1,\n2,\n3,\n4,\n5]',true],
    ['sequence key','-\n .sk\n  el1\n  el2','{"sk":["el1","el2"]}'],
    ['sequence key pp','-\n .sk\n  el1\n  el2','{\n "sk":[\n  "el1",\n  "el2"]}',true],
    ['map sequence map sequence','-\n .key\n  -\n   .key\n    el','{"key":[{"key":["el"]}]}'],
    ['map sequence map sequence pp','-\n .key\n  -\n   .key\n    el','{\n "key":[\n  {\n   "key":[\n    "el"]}]}',true],
    ['elements','el1\nel2\nel3\nel4\nel5\nel6','["el1","el2","el3","el4","el5","el6"]'],
    ['rs ls','-\n key value\nel2','[{"key":"value"},"el2"]'],
    ['rs ls pp','-\n key value\nel2','[{\n "key":"value"},\n"el2"]',true],
    ['rs rs 2xls','-\n key\n  key value\nel2','[{"key":{"key":"value"}},"el2"]'],
    ['rs rs 2xls pp','-\n key\n  key value\nel2','[{\n "key":{\n  "key":"value"}},\n"el2"]',true],
    ['rs ls rs ls','.\n el\n.\n el','[["el"],["el"]]'],
    ['rs ls rs ls pp','.\n el\n.\n el','[[\n "el"],\n[\n "el"]]',true],
    ['list in list in list','.\n .\n  .\n   el','[[[["el"]]]]'],
    ['list in list in list','.\n .\n  .\n   el','[[\n [\n  [\n   "el"]]]]',true],
    ['map in map in map','-\n key\n  key\n   key value','{"key":{"key":{"key":"value"}}}'],
    ['map in map in map pp','-\n key\n  key\n   key value','{\n "key":{\n  "key":{\n   "key":"value"}}}',true],
    ['mix','-\n key1 value1\n .sequence1\n  el1\n  el2\n key2 value2\n map2\n  key3 value3\n  .sequence2\n   el3\n   el4\n  key4 value4','{"key1":"value1","sequence1":["el1","el2"],"key2":"value2","map2":{"key3":"value3","sequence2":["el3","el4"],"key4":"value4"}}'],
    ['mix pp','-\n key1 value1\n .sequence1\n  el1\n  el2\n key2 value2\n map2\n  key3 value3\n  .sequence2\n   el3\n   el4\n  key4 value4','{\n "key1":"value1",\n "sequence1":[\n  "el1",\n  "el2"],\n "key2":"value2",\n "map2":{\n  "key3":"value3",\n  "sequence2":[\n   "el3",\n   "el4"],\n  "key4":"value4"}}',true],
    ['escaped spaces for keys','-\n this\\ is\\ a\\ key this is the value','{"this is a key":"this is the value"}'],
    ['no need for escaped spaces in sequence keys','-\n .this is a key\n  this is the value','{"this is a key":["this is the value"]}'],
    ['if number can be interpreted as number, it is a number in JSON','-\n key 5','{"key":5}'],
    ['escaping of special chars','-\n key "/\\b\\f\\t\\r\\n','{"key":"\\"/\\\\b\\\\f\\\\t\\\\r\\n"}'],
    ['interpret as primitive if possible. escape sequence if string needed.','-\n a true\n b false\n c null\n d 5\n e \\true\n f \\false\n g \\null\n h undefined','{"a":true,"b":false,"c":null,"d":5,"e":"true","f":"false","g":"null","h":"undefined"}'],
    ['sample','-\n glossary\n  title example glossary\n  GlossDiv\n   title S\n   GlossList\n    GlossEntry\n     ID SGML\n     SortAs SGML\n     GlossTerm Standard Generalized Markup Language\n     Acronym SGML\n     Abbrev ISO 8879:1986\n     GlossDef\n      para A meta-markup language, used to create markup languages such as DocBook.\n      .GlossSeeAlso\n       GML\n       XML\n     GlossSee markup','{"glossary":{"title":"example glossary","GlossDiv":{"title":"S","GlossList":{"GlossEntry":{"ID":"SGML","SortAs":"SGML","GlossTerm":"Standard Generalized Markup Language","Acronym":"SGML","Abbrev":"ISO 8879:1986","GlossDef":{"para":"A meta-markup language, used to create markup languages such as DocBook.","GlossSeeAlso":["GML","XML"]},"GlossSee":"markup"}}}}}'],
    ['backslash as value','-\n backslash \\\\','{"backslash":"\\\\\\\\"}'],
    ['key for empty sequence','-\n .key','{"key":[]}'],
    ['key for empty sequence with space','-\n .key split','{"key split":[]}'],
    ['key for empty sequence with space and dot','-\n ..key split','{".key split":[]}'],
    ['escaped key for empty sequence with space and dot','-\n \\..key split','{"..key":"split"}'],
    ['double escaped key for empty sequence with space and dot','-\n \\\\..key split','{"\\\\..key":"split"}'], // \\\\ in ASON string are two backslashes and \\\\ in JSON is actually one backslash
    ['key for empty map','-\n -key','{"key":{}}'],
    ['key for empty map with space','-\n -key split','{"key split":{}}'],
    ['key for empty map with space and hyphen','-\n --key split','{"-key split":{}}'],
    ['escaped key for empty map with space and hyphen','-\n \\--key split','{"--key":"split"}'],
    ['double escaped key for empty map with space and hyphen','-\n \\\\--key split','{"\\\\--key":"split"}'],

    
];

var firstArg = process.argv[2];
var flags = firstArg !== undefined ? firstArg.slice(1).split('') : [];
var verbose = flags.indexOf('v') != -1;
var onlyFailed = flags.indexOf('f') != -1;


var count = 0;
function runTest(d,fn, testType) {
    var success = true;
    var log = count + " " + d[0] + " " + testType;
    try {
        var r = fn(d[1],d[3]);
        if(r === d[2]) {
            log += " OK";
        } else {
            success = false;
            log += " FAIL";
            log += "\n Expected: " + d[2];
            log += "\n Actual: " + r;
        }
    } catch(e) {
        success = false;
        log += " FAIL";
        log += "\n Exception: " + e;
    }
    
    if(!(onlyFailed && success)) {
        if(verbose) {
            console.log("______________________");
            console.log(d[1]);
            console.log("_______");
            console.log(d[2]);
            console.log("_______");
        }
        console.log(log);
        if(verbose) {
            console.log("");
            console.log("");
        }
    }

    
    
    return success;
}

var countSuccess = 0;
var runBothWays = function(td) {
    if(runTest(td,ason.asonToJson,"ason to json") && runTest([td[0],td[2],td[1]],ason.jsonToAson, "json to ason")) countSuccess++;
    count++;
};

if(process.argv[3] != undefined) {
    var testIndex = process.argv[3];
    runBothWays(testData[testIndex]);
    console.log(countSuccess ? "OK" : "NOK");
} else {
    testData.forEach(function(td) {
        runBothWays(td);
    });
    console.log(countSuccess + " of " + testData.length + " succeeded");
}

var unescapeFromAsonTestData = [
    //[ from,  to]
    ["\\","\\"],
    ["\\f","\\f"],
    ["\\n","\n"],
    ["\\u002f","\u002f"],
];

for(var i = 0; i < unescapeFromAsonTestData.length; i++) {
    var expected = unescapeFromAsonTestData[i][1];
    var result = ason.unescapeFromJson(unescapeFromAsonTestData[i][0],true);
    if(expected !== result) {
        console.log("escape tests failed. Expected " + expected +" but got " +result);
    }
}

var valueEscapeTestData = [
    ["null","null"],
    ["true","true"],
    ["false","false"],
    ["1","1"],
    ["-2.34e+21","-2.34e+21"],

    ["\\null",'"null"'],
    ["\\true",'"true"'],
    ["\\false",'"false"'],
    ["\\1",'"1"'],
    ["\\-0.234e+10",'"-0.234e+10"'],
    
    //same number of backslashes because in ason, 
    //backslash is not escaped for escaping primitives. 
    //Json doesn't know the concept of escaping primitives. 
    //It just escapes the backslash. So there must be 2 of them.
    ["\\\\null",'"\\\\null"'], 
    ["\\\\true",'"\\\\true"'],
    ["\\\\false",'"\\\\false"'],
    ["\\\\1",'"\\\\1"'],
    ["\\\\-0.234e+10",'"\\\\-0.234e+10"'],    
];

//Tests if ason values are properly converted to json value strings
for(var i = 0; i < valueEscapeTestData.length; i++) {
    var jsonValueFormat = ason.convertObjectValueToJsonValueFormat(ason.convertAsonValueToObjectValue(valueEscapeTestData[i][0]));
    if(jsonValueFormat !== valueEscapeTestData[i][1]) {
        console.log("escape tests failed. Expected " +valueEscapeTestData[i][1] +" but got " +jsonValueFormat);
    }
}
    
var msg = 'equality after conversion to JS object';
var asonStr = '-\n key /';
var jsonStr = '{"key":"\\u002f"}';
var asonObj = ason.parse(asonStr);
var jsonObj = JSON.parse(jsonStr);
if(asonObj.key !== jsonObj.key) {
    console.log(msg + " test failed. Expected: " + asonObj.key + " but got " + jsonObj.key);
}
//TODO json normalizer so it is always same string as output of ason to json conversion:
//1. remove whiteSpace
//2. convert string with numbers in it into plain numbers
//3. convert \uxxxx into characters or two-character escape sequences