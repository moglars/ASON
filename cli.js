var ason = require('./ASON.js');
var fs = require('fs');

var path = process.argv[2];
fs.readFile(path,'utf-8',function(err,data){
    if(err) {
        console.log("there was an error reading the file");
    }
    var newPath = path + ".ason";
    fs.writeFile(newPath, ason.jsonToAson(data), function(err){
        if(err) {
            console.log("there was an error writing the file");
        }
    });
});