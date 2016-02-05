ason = require("./ASON.js");

testData = [
    ['string, one element','value','"value"'],
    ['number, one element','5','5'],
    ['boolean, one element','true','"true"'],
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
];

var firstArg = process.argv[2];
var flags = firstArg !== undefined ? firstArg.slice(1).split('') : [];
var verbose = flags.indexOf('v') != -1;
var onlyFailed = flags.indexOf('f') != -1;


var count = 0;
function runTest(d,fn) {
    var success = true;
    var log = count + " " + d[0];
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
    if(runTest(td,ason.asonToJson) && runTest([td[0],td[2],td[1]],ason.jsonToAson)) countSuccess++;
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

