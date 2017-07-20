/*jslint plusplus: true, vars: true, nomen: true */
/*global define, brackets, console, setTimeout, $, document, alert */

// Add D suppport
define(function (require, exports, module) {
    "use strict";
    module.exports = function () {
        var LanguageManager = brackets.getModule("language/LanguageManager");
        if (!LanguageManager.getLanguage("d")) { // check if already handled
            /*
            LanguageManager.defineLanguage("d", {mode: "d", name: "d"}).done(function (language) {
                console.log("Language " + language.getName() + " is now available!");
                language.addFileExtension("d");
            });
            */

            LanguageManager.defineLanguage("d", {
                name: "d",
                mode: ["d", "text/x-d"],
                fileExtensions: ["d"]
            });
            //require("d"); // for later custom support
        }
    };
});