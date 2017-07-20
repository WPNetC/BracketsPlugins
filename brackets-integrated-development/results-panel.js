/*jslint plusplus: true, vars: true, nomen: true */
/*global define, brackets, console, setTimeout, $, document, alert */

define(function (require, exports, module) {
    "use strict";
    var PanelManager = brackets.getModule("view/PanelManager"),
        DocumentManager = brackets.getModule("document/DocumentManager"),
        EditorManager = brackets.getModule("editor/EditorManager"),
        decorate = require("decorate");

    var panel,
        panelHTML = require('text!results-panel.html'),
        panelIsVisible = false;

    panel = PanelManager.createBottomPanel("brackets-builder-panel", $(panelHTML), 100);
    $('#builder-panel .close').on('click', function () {
        panel.hide();
    });

    function _processCmdOutput(data) {
        data = data.replace(/^[ ]*(\\n)+/, ''); // remove starting new lines
        //data = JSON.stringify(data);

        //data = data.replace(/\\n/g, '<br />').replace(/\\t/g, '');
        data.replace(/^[ ]*\"/, '').replace(/\"[ ]*$/, ''); // remove quotes
        return data;
    }

    function onPanelClickMaker(filename, errObj, lastErrors) {
        var line = errObj.line;
        return function () {
            console.log("Setting doc to " + filename);
            var doc = DocumentManager.getDocumentForPath(filename);
            doc.then(function (doc) {
                DocumentManager.setCurrentDocument(doc);
                decorate.setCurrentFile();
                decorate.add_errors_to_file(lastErrors);

                // set cursor TODO: non working
                var dm = DocumentManager.getCurrentDocument()._masterEditor;
                var cm = dm._codeMirror;
                cm.setCursor(line);
                cm.scrollIntoView({
                    line: line,
                    ch: 0
                });
                EditorManager.focusEditor();
            }).done();
        };
    }

    function setPanel(data, compilerFail) {
        if (!data) {
            data = "";
            $('#builder-panel .builder-content-errors').empty();
            panel.hide();
            return;
        }
        if (typeof data === "string") {
            $('#builder-panel .resizable-content-error').hide();
            $('#builder-panel .builder-content-result').show().text(_processCmdOutput(data));
        } else {
            $('#builder-panel .builder-content-result').hide();
            $('#builder-panel .resizable-content-error').show();
            $('#builder-panel .builder-content-errors').append(data);
        }

        if (compilerFail) {
            $('.build-success').hide();
        } else {
            $('.build-success').show();
        }
        panel.show();
    }

    function cleanFilename(file) {
        return file.replace(/^[\w\W]*[\\\/]/, '');
    }

    function setErrors(lastErrors) {
        var filename,
            n;

        for (filename in lastErrors) {
            if (lastErrors.hasOwnProperty(filename)) {
                var o = lastErrors[filename];
                for (n = 0; n < o.length; n++) {

                    var panel_txt = "<tr class='panel_error'>";
                    panel_txt += "<td class='error-icon'></td>";
                    panel_txt += "<td><pre>" + _processCmdOutput(o[n].error) + "</pre></td>";
                    panel_txt += "<td>" + cleanFilename(filename) + "</td><td>" + (+(o[n].line) + 1) + "</td>";
                    panel_txt += "</tr>";

                    var panel_node = $(panel_txt);
                    panel_node.on("click", onPanelClickMaker(filename, o[n], lastErrors));
                    //console.log("panel_txt " + panel_txt);
                    setPanel(panel_node, true);
                }
            }
        }
    }

    module.exports = {
        setPanel: setPanel,
        setErrors: setErrors
    };
});