ason = require("./ASON.js");

testData = [
    ['anonymous map','-\n key value','[{"key":"value"}]'],
    ['list','el1\nel2','["el1","el2"]'],
    ['sequence key','-\n .sk\n  el1\n  el2','[{"sk":["el1","el2"]}]'],
    ['map sequence map sequence','-\n .key\n  -\n   .key\n    el','[{"key":[{"key":["el"]}]}]'],
    ['elements','el1\nel2\nel3\nel4\nel5\nel6','["el1","el2","el3","el4","el5","el6"]'],
    ['rs ls','-\n key value\nel2','[{"key":"value"},"el2"]'],
    ['rs rs 2xls','-\n key\n  key value\nel2','[{"key":{"key":"value"}},"el2"]'],
    ['rs ls rs ls','.\n el\n.\n el','[["el"],["el"]]'],
    ['list in list in list','.\n .\n  .\n   el','[[[["el"]]]]'],
    ['map in map in map','-\n key\n  key\n   key value','[{"key":{"key":{"key":"value"}}}]'],
    ['mix','-\n key1 value1\n .sequence1\n  el1\n  el2\n key2 value2\n map2\n  key3 value3\n  .sequence2\n   el3\n   el4\n  key4 value4','[{"key1":"value1","sequence1":["el1","el2"],"key2":"value2","map2":{"key3":"value3","sequence2":["el3","el4"],"key4":"value4"}}]'],
];

var count = 0;
function runTest(d) {
    var log = count + " " + d[0];
    try {
        var r = ason.asonToJson(d[1]);
        if(r === d[2]) {
            log += " OK";
        } else {
            log += " FAIL";
            log += "\n Expected: " + d[2];
            log += "\n Actual: " + r;
        }
    } catch(e) {
        log += " FAIL";
        log += "\n Exception: " + e;
    }
    if(process.argv[2] === "-v") {
        console.log("______________________");
        console.log(d[1]);
        console.log("_______");
        console.log(d[2]);
        console.log("_______");
    }

    console.log(log);
    console.log("");
    console.log("");
    count++;
}

testData.forEach(function(td) {
    runTest(td);
});