ason = require("./ASON.js");
fs = require("fs");
fs.readFile("test.txt","ascii",function(err,data){
    try {
        var testResult = ason.asonToJson(data);
        fs.readFile("testResult.txt", "ascii", function(err,data) {
            if(testResult === data){
                console.log("OK");
            } else {
                console.log("NOK");
            }
        });
    } catch(e) {
        console.log(e);
    }
    

});