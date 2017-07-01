/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, node: true */

(function () {

    "use strict";

    var exec = require("child_process").exec;

    // Run external scss-lint command
    function cmdBuild(scssFile, projectRoot, configFile, gemDir, maxExecBuffer, callback) {
        var configSwitch = "",
            cmd;

        if (configFile !== null) {
            configSwitch = "-c " + configFile;
        }

        // Build command
        cmd = gemDir + "scss-lint -f JSON " + configSwitch + " \"" + scssFile + "\"";

        // Call external scss-lint command
        // Exit codes: https://github.com/brigade/scss-lint/blob/14ea8408dbdd867f33482825d6ccb80f841fbe19/lib/scss_lint/cli.rb#L11
        exec(cmd, { maxBuffer: maxExecBuffer }, function (error, stdout, stderr) {
            var message;

            // These error codes are okay
            if (!stderr && (error === null || error.code === 1 || error.code === 2)) {
                callback(false, stdout);
            } else {
                switch(error.code) {
                    case 64:
                        message = "Command line usage error";
                        break;

                    case 66:
                        message = "Input file did not exist or was not readable";
                        break;

                    case 70:
                        message = "Internal software error";
                        break;

                    case 78:
                        message = "Configuration error";
                        break;

                    case 80:
                        message = "No files matched by specified glob patterns";
                        break;

                    case 81:
                        message = "This file is filtered by exclusions";
                        break;

                    default:
                        message = error.toString();

                        if (message.indexOf("maxBuffer exceeded") !== -1) {
                            message = "Too many errors. Try a smaller file or setting scsslint.maxBuffer config. ( See: https://github.com/chimo/brackets-scss-lint/blob/master/README.md )";
                        }
                }

                callback(message);
            }
        });
    }

    // Register "scss" domain
    function init(domainManager) {
        if (!domainManager.hasDomain("scss")) {
            domainManager.registerDomain("scss", {major: 0, minor: 1});
        }

        domainManager.registerCommand(
            "scss",
            "build",
            cmdBuild,
            true,
            "Runs scss linter",
            ["scssFile", "projectRoot", "configFile", "gemDir", "maxExecBuffer"],
            [{
                name: "result",
                type: "string",
                description: "The result of the execution"
            }]
        );
    }

    exports.init = init;
}());
