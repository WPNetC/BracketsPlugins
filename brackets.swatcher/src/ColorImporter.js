/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, browser: true */
/*global define, brackets, $, Mustache */

define(function(require, exports) {
    var EditorManager = brackets.getModule('editor/EditorManager'),

        ColorFragment = require('text!../tpl/ColorTableFragment.html'),

        Modes = require('../modes'),
        Utils = require('./Utils'),
        ColorNames = require('./lib/colornames'),
        messages = require('./Messages'),
        registered = false;

    var ColorImporter = {
        registerPanel: function($panel) {
            if (!registered) {

                ColorNames.init();
                $panel.on('click', '.swatcher-colortable-colorremove', function() {
                    $(this).parent().parent().fadeOut(function() {
                        $(this).remove();
                    });
                });

                $panel.on('click', '.swatcher-colortable-import', function() {
                    ColorImporter.EditorImport(EditorManager.getFocusedEditor());
                });

                $panel.on('click', '.swatcher-colortable-close', function() {
                    ColorImporter.exit();
                });

                registered = true;
            }
        },

        addObject: function(obj) {
            obj.forEach(function(color) {
                if (color.originFormat === 'CMYK') {
                    ColorImporter.add(color.hash, color.name, true);
                } else {
                    ColorImporter.add(color.hash, color.name);
                }

            });
        },

        addArray: function(array) {
            array.forEach(function(color) {
                ColorImporter.add(color, false);
            });
        },

        add: function(hex, name, converted) {
            if (typeof converted === 'undefined') {
                converted = false;
            }

            hex = hex.toUpperCase();
            var $colordouble = $('.swatcher-colortable').find('[data-hex="' + hex + '"]');

            if ($colordouble.size() > 0 && typeof name === 'undefined') {
                $colordouble.fadeTo(333, 0.3, function() {
                    $colordouble.fadeTo(333, 1);
                });

            } else {

                if (typeof name === 'undefined' || name === '') {
                    name = ColorNames.name(hex)[1].replace(/[^a-zA-Z0-9-_]/gi, '').toLowerCase();
                    var sameNames= $('.swatcher-colortable').find('[data-colorname="' + name + '"]').size();
                    
                    if (sameNames > 0) {
                        name = name + '-' + sameNames;
                    }
                }
                
                var mObj = {
                    colorname: name,
                    colorhex: hex
                };

                if (converted === true) {
                    mObj.converted = true;
                }
                
                $('.swatcher-colortable').append(Mustache.render(ColorFragment, mObj))
                    .children(':last').hide().fadeIn();
            }
        },

        EditorImport: function(editor) {

            if (editor) {
                var str = '';
                var ModesObject = Modes.getMode(editor.document.language._mode);

                if (ModesObject) {
                    $('.swatcher-colortable tr').each(function() {
                        if ($(this).data('hex')) {
                            str += ModesObject.trigger + $(this).find('input').val() + ': ' + $(this).data('hex') + '; \n';
                        }
                    });

                    str = '\n' + '/* Generated by Brackets Swatcher */' + '\n' + str;
                    Utils.insert(editor, str);
                } else {
                    messages.dialog('ACO_NOSUPPORT');
                }
            } else {
                messages.dialog('ACO_NOFILE');
            }
        },

        exit: function() {
            $('#swatcher-container').empty();
        }
    };

    return ColorImporter;
});