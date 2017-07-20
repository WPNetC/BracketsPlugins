/**
by Jonathan Dunlap

TODO: Run button only shows up for supported file types
TODO: Error on ran file won't go away if it's clicked on in the error panel before being removed.
**/

/*jslint plusplus: true, vars: true, nomen: true */
/*global define, brackets, console, setTimeout, $, document, alert */

define(function (require, exports, module) {
    "use strict";
    var ext_name = "Brackets Compiler Support",
        ext_name_notify = "[[" + ext_name + "]]";
    var AppInit = brackets.getModule("utils/AppInit"),
        commands = brackets.getModule("command/Commands"),
        DocumentCommandHandlers = brackets.getModule("document/DocumentCommandHandlers"),
        CommandManager = brackets.getModule("command/CommandManager"),
        Menus = brackets.getModule("command/Menus"),
        NodeConnection = brackets.getModule("utils/NodeConnection"),
        ExtensionUtils = brackets.getModule("utils/ExtensionUtils"),
        DocumentManager = brackets.getModule("document/DocumentManager"),
        KeyBindingManager = brackets.getModule('command/KeyBindingManager'),
        FileUtils = brackets.getModule("file/FileUtils"),
        PanelManager = brackets.getModule("view/PanelManager"),
        Dialogs = brackets.getModule("widgets/Dialogs"),
        nodeConnection = new NodeConnection(),
        domainPath = ExtensionUtils.getModulePath(module) + "domain",
        EditorManager = brackets.getModule("editor/EditorManager"),
        CodeMirror = brackets.getModule("thirdparty/CodeMirror2/lib/codemirror"),
        panel = require("results-panel"),
        save = require("save"),
        decorate = require("decorate");

    var cmd = '',
        compiling = false,
        line_reg,
        file_reg,
        msg_reg,
        seperator,
        lastErrors = {}; //{fileName:[{line:int,error:string},...], ...}

    var builders = JSON.parse(require('text!builder.json'));

    function handle_success(msg) {
        console.log("Success from compiler: " + msg);
        if (msg.replace(/[ |\n]/g, "") === "") {
            msg = "Success: empty output";
        }
        panel.setPanel(msg, false);
        compiling = false;
        $("#Toolbar-Debug-And-Run").show();
    }

    function reset() {
        panel.setPanel("", false);
        decorate.reset(lastErrors);
        lastErrors = {};
    }
    
    // Get last item in list
    function last(list) {
        if (list.length - 1 < 0) { return undefined; }
        return list[list.length - 1];
    }
    
    function handle_error(msg) {
        console.log("Fail from compiler: " + msg);
        
        var msgs = msg.split(seperator),
            i,
            name = DocumentManager.getCurrentDocument().file._name,
            files = [],
            foundErrors = 0;

        for (i = 0; i < msgs.length; i++) {
            // filter out errors not in file
            var file = file_reg.exec(msgs[i]),
                line = line_reg.exec(msgs[i]),
                err = msg_reg.exec(msgs[i]);
            if (file && line && err) {
                foundErrors += 1;
                file = last(file); // get last match
                file = file.replace(/\\/g, "/"); // Windows fix
                //console.log("file " + file);
                line = +(last(line)) - 1;
                err = last(err);
                if (!lastErrors[file]) {
                    lastErrors[file] = [];
                }
                lastErrors[file].push({
                    line: line,
                    error: err
                });
                //console.log(line + " || " + err);

                files.push(file);
            }
        }
        if (foundErrors > 0) {
            decorate.add_errors_to_file(lastErrors); // TODO: decorate all files in above loop
            panel.setErrors(lastErrors);
        } else {
            panel.setPanel(msg, true); // fallback if no error lines parsed
        }
        compiling = false;
        $("#Toolbar-Debug-And-Run").show();
    }

    function handle_node(file, path, typename) {
        reset(); // remove past error markers

        nodeConnection.connect(true).fail(function (err) {
            console.error(ext_name_notify + "Cannot connect to node: ", err);
        }).then(function () {
            console.log('Building ' + file + ' in ' + path + '...\n');

            return nodeConnection.loadDomains([domainPath], true).fail(function (err) {
                console.error(ext_name_notify + " Cannot register domain: ", err);
            });
        }).then(function () {
            builders.forEach(function (el) {
                if (el.name.toLowerCase() === typename.toLowerCase()) {
                    cmd = el.cmd;
                    line_reg = new RegExp(el.line_reg);
                    file_reg = new RegExp(el.file_reg);
                    msg_reg = new RegExp(el.msg_reg);
                    seperator = new RegExp(el.seperator);
                }
            });
            // var curOpenFileEsc = curOpenFile.replace(" ", "\\ ");
            cmd = cmd.replace("$FILE", '"' + file + '"'); //+'"'
        }).then(function () {
            nodeConnection.domains["builder.execute"].exec(path, cmd)
                .fail(handle_error)
                .then(handle_success);
        }).done();
    }

    function handle(file, path, typename) {
        if (compiling) { return; }
        if (!file || !path || !typename) {
            file = DocumentManager.getCurrentDocument().file._path;
            path = DocumentManager.getCurrentDocument().file._parentPath;
            typename = DocumentManager.getCurrentDocument().language._name;
        }
        
        if (builders.filter(function (el) { return el.name.toLowerCase() === typename.toLowerCase(); }).length === 0) { return; }
        compiling = true;
        $("#Toolbar-Debug-And-Run").hide();
        
        
        // Save current file
        var saveFileList = DocumentManager.getAllOpenDocuments(),
            i,
            filteredList = [];
        // Filter out files of a different type
        for (i = 0; i < saveFileList.length; i++) {
            if (saveFileList[i].language._name.toLowerCase() === typename.toLowerCase()) {
                filteredList.push(saveFileList[i].file);
            }
        }

        save.saveFileList(filteredList).then(function () {
            handle_node(file, path, typename);
        });

    }

    AppInit.appReady(function () {
        CommandManager.register('Run', 'builder.build', handle);

        KeyBindingManager.addBinding('builder.build', 'Ctrl-Alt-B');

        // Add menu item to edit .json file
        var menu = Menus.getMenu(Menus.AppMenuBar.EDIT_MENU);

        menu.addMenuDivider();
        // Create menu item that opens the config .json-file
        CommandManager.register("Edit Builder", 'builder.open-conf', function () {
            Dialogs.showModalDialog('', 'Brackets Builder Extention', 'You must restart Brackets after changing this file.');
            var src = FileUtils.getNativeModuleDirectoryPath(module) + "/builder.json";

            DocumentManager.getDocumentForPath(src).done(
                function (doc) {
                    DocumentManager.setCurrentDocument(doc);
                }
            );
        });

        menu.addMenuItem('builder.open-conf');
        menu.addMenuItem('builder.build');

        $("<a href='#' id='Toolbar-Debug-And-Run' title='Run'></a>").appendTo("#main-toolbar div.buttons").on("click", handle);

        // Load css
        ExtensionUtils.loadStyleSheet(module, "brackets-builder.css");
        
        // Add D langauge support if not defined
        require("d/dsupport")();
        require("preferences")(handle);
    });

});