"use strict";
define(function (require, exports, module) {
    var CodeInspection = brackets.getModule('language/CodeInspection');
    var ProjectManager = brackets.getModule('project/ProjectManager');
    var ExtensionUtils = brackets.getModule('utils/ExtensionUtils');
    var NodeDomain = brackets.getModule('utils/NodeDomain');
    var CommandManager = brackets.getModule('command/CommandManager');
    var Menus = brackets.getModule('command/Menus');
    var DocumentManager = brackets.getModule('document/DocumentManager');
    var EditorManager = brackets.getModule('editor/EditorManager');
    var PreferencesManager = brackets.getModule('preferences/PreferencesManager');
    var PackageJson = JSON.parse(require('text!../package.json'));
    var EXTENSION_NAME = PackageJson.name;
    var EXTENSION_UNIQUE_NAME = 'zaggino.' + EXTENSION_NAME;
    var AUTOFIX_COMMAND_ID = EXTENSION_UNIQUE_NAME + '.autofix';
    var AUTOFIX_COMMAND_NAME = 'Auto-fix with ESLint';
    var log = require('./log');
    var preferences = PreferencesManager.getExtensionPrefs(EXTENSION_NAME);
    preferences.definePreference('gutterMarks', 'boolean', true);
    preferences.set('gutterMarks', preferences.get('gutterMarks'));
    var LINTER_NAME = 'ESLint';
    var nodeDomain = new NodeDomain(EXTENSION_UNIQUE_NAME, ExtensionUtils.getModulePath(module, './node/domain'));
    function handleLintSync(text, fullPath) {
        throw new Error('ESLint sync is not available, use async for ' + fullPath);
    }
    function handleLintAsync(text, fullPath) {
        var deferred = $.Deferred();
        var projectRoot = ProjectManager.getProjectRoot().fullPath;
        nodeDomain.exec('lintFile', projectRoot, fullPath, text)
            .then(function (report) {
            var w = window;
            if (w.bracketsInspectionGutters) {
                w.bracketsInspectionGutters.set(EXTENSION_UNIQUE_NAME, fullPath, report, preferences.get('gutterMarks', projectRoot));
            }
            else {
                log.error("No bracketsInspectionGutters found on window, gutters disabled.");
            }
            deferred.resolve(report);
        }, function (err) {
            deferred.reject(err);
        });
        return deferred.promise();
    }
    function handleAutoFix() {
        var doc = DocumentManager.getCurrentDocument();
        var language = doc.getLanguage();
        var fileType = language._id;
        var fullPath = doc.file.fullPath;
        var editor = EditorManager.getCurrentFullEditor();
        var cursor = editor.getCursorPos();
        var scroll = editor.getScrollPos();
        if (fileType !== 'javascript') {
            return;
        }
        var projectRoot = ProjectManager.getProjectRoot().fullPath;
        nodeDomain.exec('fixFile', projectRoot, fullPath, doc.getText())
            .then(function (response) {
            var text = response && response.results[0] ? response.results[0].output : '';
            if (text) {
                doc.setText(text);
            }
            editor.setCursorPos(cursor);
            editor.setScrollPos(scroll.x, scroll.y);
        }, function (err) {
            log.error("fixFile -> error: " + err);
        });
    }
    CommandManager.register(AUTOFIX_COMMAND_NAME, AUTOFIX_COMMAND_ID, handleAutoFix);
    var editMenu = Menus.getMenu(Menus.AppMenuBar.EDIT_MENU);
    editMenu.addMenuDivider();
    editMenu.addMenuItem(AUTOFIX_COMMAND_ID);
    var contextMenu = Menus.getContextMenu(Menus.ContextMenuIds.EDITOR_MENU);
    contextMenu.addMenuItem(AUTOFIX_COMMAND_ID);
    ['javascript', 'jsx', 'typescript', 'tsx'].forEach(function (langId) {
        CodeInspection.register(langId, {
            name: LINTER_NAME,
            scanFile: handleLintSync,
            scanFileAsync: handleLintAsync
        });
    });
});
