/*jslint plusplus: true, vars: true, nomen: true */
/*global define, brackets, console, setTimeout, $, document, alert */

define(function (require, exports, module) {
    "use strict";
    
    var _runCompile;
    var prefs;
    var DocumentManager = brackets.getModule("document/DocumentManager");
    var ProjectManager = brackets.getModule("project/ProjectManager");
    var basefile,
        basefiletype;
    function run() {
        if (prefs.get("autocompile") && prefs.get("basefile") && prefs.get("basefiletype")) {
            basefile = prefs.get("basefile");
            basefiletype = prefs.get("basefiletype");
            var root = ProjectManager.getProjectRoot()._path,
                fullFilePath = root + basefile;
            //var doc = DocumentManager.getDocumentForPath(fullFilePath);
            _runCompile(fullFilePath, root, basefiletype);
        } else { _runCompile(); }
        console.log("auto compiling");
    }
    
    function setupPrefs() {
        $(DocumentManager).off("currentDocumentChange documentSaved", run);
        
        if (prefs.get("autocompile") && prefs.get("basefile") && prefs.get("basefiletype")) {
            basefile = prefs.get("basefile");
            basefiletype = prefs.get("basefiletype");
            $(DocumentManager).on("documentSaved", run);
        } else if (prefs.get("autocompile")) {
            $(DocumentManager).on("currentDocumentChange documentSaved", run);
        }
        
    }
    module.exports = function (runCompile) {
        _runCompile = runCompile;
        var PreferencesManager = brackets.getModule("preferences/PreferencesManager");
        prefs = PreferencesManager.getExtensionPrefs("IDE");
        
        prefs.definePreference("autocompile", "boolean", false).on("change", function (e, data) {
            setupPrefs();
        });
        
        //$(DocumentManager).on("currentDocumentChange", handleDocumentChange);
    
        console.log("000" + prefs.get("autocompile"));
        
        setupPrefs();
        
    };
});