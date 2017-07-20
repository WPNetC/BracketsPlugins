/*jslint plusplus: true, vars: true, nomen: true */
/*global define, brackets, console, setTimeout, $, document, alert */

define(function (require, exports, module) {
    "use strict";
    var DocumentManager = brackets.getModule("document/DocumentManager");


    var curOpenDir,
        curOpenFile,
        curOpenLang;

    function make_gutter() {
        /*
        var cm = DocumentManager.getCurrentDocument()._masterEditor._codeMirror;
        var hasGutter = false;
        var i, n;
        for (i = 0, n = cm.getOption('gutters'); i < n.length; i++) {
            hasGutter = hasGutter || n[i] === 'compiler-gutter';
        }
        if (!hasGutter) {
            cm.setOption('gutters', ["compiler-gutter"].concat(cm.getOption('gutters')));
        }
        */
    }

    function remove_gutter() {
        /*
        var cm = DocumentManager.getCurrentDocument()._masterEditor._codeMirror;
        var opts = [], i, n;
        for (i = 0, n = cm.getOption('gutters'); i < n.length; i++) {
            if (n[i] !== 'compiler-gutter') { opts.push(n[i]); }
        }
        
        cm.setOption('gutters', opts);
        cm.clearGutter("compiler-gutter"); //added
        */
    }

    function add_line_errors(line, msg) {
        var dm = DocumentManager.getCurrentDocument()._masterEditor;
        var cm = dm._codeMirror;
        /*
        var e = document.createElement('span');
        e.appendChild(document.createTextNode("●●●"));
        e.style.color = "red";
        e.style.size = 18;
        e.style.textAlign = "right";
        e.title = msg;
        cm.setGutterMarker(line, "compiler-gutter", e);
        */
        var doc = cm.getDoc();
        var marker = doc.markText({line: line, ch: 0}, {line: line + 1, ch: 0}, {className: "cm-error", clearOnEnter: true, clearWhenEmpty: true, title: msg});
        
        ///cm.addLineClass(line, "text", "line-text-error");
       /// cm.addLineClass(line, "background", "cm-error");
        // cm.addLineClass(line, "text", "cm-keyword");
        // cm.addLineClass(line, "text", "CodeMirror-selectedtext");

        cm.refresh();
        return marker;
    }

    function setCurrentFile() {
        curOpenDir = DocumentManager.getCurrentDocument().file._parentPath;
        curOpenFile = DocumentManager.getCurrentDocument().file._path;
        curOpenLang = DocumentManager.getCurrentDocument().language._name;
    }

    function resetFile(lastFileErrors, doc) {
        var cm = doc._masterEditor._codeMirror;
        var size = cm.doc.size;
        
        var i;
        while (lastFileErrors.length > 0) {
            var marker = lastFileErrors.pop().marker;
            if (marker) { marker.clear(); }
            //cm.removeLineClass(i, "background", "cm-error");
            //cm.removeLineClass(i, "text", "line-text-error");
        }
    }

    function reset(lastErrors) {
        $('.line-text-error').attr('title', "");
        remove_gutter();
        setCurrentFile(); // TODO: not sure if needed
        var docList = DocumentManager.getAllOpenDocuments();
        var i;
        for (i = 0; i < docList.length; i++) {
            var doc = docList[i];
            var file_type = doc.language._name;
            if (curOpenLang === file_type) {
                var file = doc.file._path;
                if (lastErrors[file]) {
                    resetFile(lastErrors[file], doc);
                }
            }
        }
    }


    function add_errors_to_file(lastErrors) {
        setCurrentFile();

        // Set Gutter
        make_gutter();

        // decorate current file
        var i,
            n = lastErrors[curOpenFile];
        for (i = 0; n && i < n.length; i++) {
            if (!n[i].marker || !n[i].marker.find()) { n[i].marker = add_line_errors(n[i].line, n[i].error); }
        }
    }

    module.exports = {
        setCurrentFile: setCurrentFile,
        add_errors_to_file: add_errors_to_file,
        reset: reset
    };
});