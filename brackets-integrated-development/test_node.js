/*global require, exports, console, use */

var executer = require('./domain');
function cb(err, suc) {
    "use strict";
    //console.log("cb called " + err + " success:" + suc);
    if (err) { console.log("error::" + err); }
    if (suc) { console.log("success::" + suc); }
}
var cmd = "ruby /home/jdunlap/.config/Brackets/extensions/user/brackets-compiler-support/test1.rb",
    dir = "/home/jdunlap/.config/Brackets/extensions/user/brackets-compiler-support/";

//var cmd = "ruby test1.rb",
//    dir = ".";

cmd = "php tests/test1.php";
dir = ".";

executer.exec(dir, cmd, cb);
console.log("completed");