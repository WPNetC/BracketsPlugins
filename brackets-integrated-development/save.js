/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window */

/**
 * From: brackets-autosave-files-on-window-blur Author: martypenner
 * Autosaves all files when leaving Brackets, in the style of PHPStorm/WebStorm.
 *
 * The functions are essentially copied from document/DocumentCommandHandlers.js. The only
 * modification is a check if the current document in the loop is untitled (i.e. hasn't
 * been saved to a permanent disk location). If it is, don't bother trying to save it.
 */
define(function (require, exports, module) {
    'use strict';

    var CommandManager = brackets.getModule('command/CommandManager'),
        Commands = brackets.getModule('command/Commands'),
        DocumentManager = brackets.getModule('document/DocumentManager'),
        Async = brackets.getModule('utils/Async');

    /** Unique token used to indicate user-driven cancellation of Save As (as opposed to file IO error) */
    var USER_CANCELED = {
        userCanceled: true
    };

    function saveFileList(fileList) {
        // Do in serial because doSave shows error UI for each file, and we don't want to stack
        // multiple dialogs on top of each other
        var userCanceled = false,
            filesAfterSave = [];

        return Async.doSequentially(
            fileList,
            function (file) {
                // Abort remaining saves if user canceled any Save As dialog
                if (userCanceled) {
                    return (new $.Deferred()).reject().promise();
                }

                var doc = DocumentManager.getOpenDocumentForPath(file.fullPath);
                if (doc && !doc.isUntitled()) {
                    var savePromise = CommandManager.execute(Commands.FILE_SAVE, {
                        doc: doc
                    });
                    savePromise
                        .done(function (newFile) {
                            filesAfterSave.push(newFile);
                        })
                        .fail(function (error) {
                            if (error === USER_CANCELED) {
                                userCanceled = true;
                            }
                        });
                    return savePromise;
                } else {
                    // working set entry that was never actually opened - ignore
                    filesAfterSave.push(file);
                    return (new $.Deferred()).resolve().promise();
                }
            },
            false // if any save fails, continue trying to save other files anyway; then reject at end
        ).then(function () {
            return filesAfterSave;
        });
    }
    
    module.exports = {saveFileList: saveFileList};
});