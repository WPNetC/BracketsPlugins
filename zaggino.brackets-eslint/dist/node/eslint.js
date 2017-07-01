"use strict";
var PackageJson = require('../../package.json');
var EXTENSION_NAME = PackageJson.name;
var fs = require('fs');
var path = require('path');
var nodeVersion = process.versions.node;
var isOldNode = /^0/.test(nodeVersion);
var defaultCwd = process.cwd();
var ESLINT_SEVERITY_ERROR = 2;
var ESLINT_SEVERITY_WARNING = 1;
var BRACKETS_TYPE_ERROR = 'problem_type_error';
var BRACKETS_TYPE_WARNING = 'problem_type_warning';
var BRACKETS_TYPE_META = 'problem_type_meta';
var cli = null;
var currentVersion = null;
var currentProjectRoot = null;
var currentProjectRootHasConfig = false;
var erroredLastTime = true;
var log = {
    info: function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return console.log.apply(console, ['[' + EXTENSION_NAME + ']'].concat(args));
    },
    warn: function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return console.warn.apply(console, ['[' + EXTENSION_NAME + ']'].concat(args));
    },
    error: function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return console.error.apply(console, ['[' + EXTENSION_NAME + ']'].concat(args));
    }
};
function getCli(eslintPath, opts) {
    var _realPath;
    try {
        _realPath = require.resolve(eslintPath);
    }
    catch (err) {
        log.error("Wasn't able to resolve path to eslint: " + err.stack);
        return null;
    }
    var _eslint;
    try {
        _eslint = require(eslintPath);
    }
    catch (err) {
        log.error("Wasn't able to load eslint from " + _realPath + ", be sure to run 'npm install' properly: " + err.stack);
        return null;
    }
    if (!_eslint.CLIEngine) {
        log.error("No CLIEngine found for eslint loaded from " + _realPath + ", which version are you using?");
        return null;
    }
    return new _eslint.CLIEngine(opts);
}
function getEslintVersion(eslintPath) {
    return require(eslintPath + '/package.json').version;
}
function refreshEslintCli(eslintPath, opts, allowLocalEslint) {
    if (eslintPath == null) {
        if (allowLocalEslint) {
            eslintPath = 'eslint';
        }
        else {
            currentVersion = null;
            cli = null;
            return;
        }
    }
    try {
        currentVersion = getEslintVersion(eslintPath);
        cli = getCli(eslintPath, opts);
    }
    catch (err) {
        log.error(err);
    }
}
exports.refreshEslintCli = refreshEslintCli;
function uniq(arr) {
    return arr.reduce(function (result, item) {
        if (result.indexOf(item) === -1) {
            result.push(item);
        }
        return result;
    }, []);
}
function normalizeDir(dirPath) {
    if (dirPath.match(/(\\|\/)$/)) {
        dirPath = dirPath.slice(0, -1);
    }
    return process.platform === 'win32' ? dirPath.replace(/\//g, '\\') : dirPath;
}
function nodeModulesInDir(dirPath) {
    return path.resolve(normalizeDir(dirPath), 'node_modules');
}
function setProjectRoot(projectRoot, prevProjectRoot) {
    if (!projectRoot) {
        projectRoot = currentProjectRoot;
    }
    var opts = {};
    var eslintPath = null;
    var rulesDirPath;
    var ignorePath;
    var allowLocalEslint = true;
    if (projectRoot) {
        opts.cwd = projectRoot;
        try {
            currentProjectRootHasConfig = fs.readdirSync(projectRoot).some(function (file) {
                return /^\.eslintrc($|\.[a-z]+$)/i.test(file);
            });
        }
        catch (err) {
            log.warn("Failed to read contents of " + projectRoot + ": " + err);
            currentProjectRootHasConfig = false;
        }
        if (!currentProjectRootHasConfig) {
            opts.baseConfig = { extends: 'eslint:recommended' };
        }
        allowLocalEslint = !currentProjectRootHasConfig;
        eslintPath = projectRoot + 'node_modules/eslint';
        try {
            if (fs.statSync(eslintPath).isDirectory()) {
            }
            else {
                throw new Error('not found');
            }
        }
        catch (ignoreErr) {
            eslintPath = null;
        }
        rulesDirPath = projectRoot + '.eslintrules';
        try {
            if (fs.statSync(rulesDirPath).isDirectory()) {
                opts.rulePaths = [rulesDirPath];
            }
        }
        catch (ignoreErr) {
        }
        ignorePath = projectRoot + '.eslintignore';
        try {
            if (fs.statSync(ignorePath).isFile()) {
                opts.ignore = true;
                opts.ignorePath = ignorePath;
            }
        }
        catch (ignoreErr) {
        }
    }
    var nodePaths = process.env.NODE_PATH ? process.env.NODE_PATH.split(path.delimiter) : [];
    if (prevProjectRoot) {
        var io = nodePaths.indexOf(nodeModulesInDir(prevProjectRoot));
        if (io !== -1) {
            nodePaths.splice(io, 1);
        }
    }
    if (projectRoot) {
        nodePaths = [nodeModulesInDir(projectRoot)].concat(nodePaths);
        process.chdir(normalizeDir(projectRoot));
    }
    else {
        process.chdir(defaultCwd);
    }
    nodePaths = uniq(nodePaths);
    process.env.NODE_PATH = nodePaths.join(path.delimiter);
    require('module').Module._initPaths();
    refreshEslintCli(eslintPath, opts, allowLocalEslint);
}
exports.setProjectRoot = setProjectRoot;
function mapEslintMessage(result, majorVersion) {
    var offset = majorVersion < 1 ? 0 : 1;
    var message;
    var type;
    switch (result.severity) {
        case ESLINT_SEVERITY_ERROR:
            message = 'ERROR: ';
            type = BRACKETS_TYPE_ERROR;
            break;
        case ESLINT_SEVERITY_WARNING:
            message = 'WARNING: ';
            type = BRACKETS_TYPE_WARNING;
            break;
        default:
            message = 'UNKNOWN: ';
            type = BRACKETS_TYPE_META;
    }
    message += result.message;
    if (result.ruleId) {
        message += ' [' + result.ruleId + ']';
    }
    return {
        type: type,
        message: message,
        pos: {
            line: result.line - 1,
            ch: result.column - offset
        }
    };
}
function createCodeInspectionReport(eslintReport) {
    var version = eslintReport.eslintVersion ? eslintReport.eslintVersion.split('.')[0] : 1;
    var results = eslintReport.results ? eslintReport.results[0] : null;
    var messages = results ? results.messages : [];
    return {
        errors: messages.map(function (x) { return mapEslintMessage(x, version); })
    };
}
function createUserError(message) {
    erroredLastTime = true;
    return {
        errors: [{
                type: 'problem_type_error',
                message: message,
                pos: { line: 0, ch: 0 }
            }]
    };
}
function lintFile(projectRoot, fullPath, text, callback) {
    if (isOldNode && currentVersion && /^3/.test(currentVersion)) {
        return callback(null, createUserError("ESLintError: Legacy node process detected (" + nodeVersion + "), " +
            ("please update to Brackets 1.8 or Brackets-Electron to support ESLint " + currentVersion)));
    }
    if (erroredLastTime || projectRoot !== currentProjectRoot) {
        try {
            setProjectRoot(projectRoot, currentProjectRoot);
            currentProjectRoot = projectRoot;
            erroredLastTime = false;
        }
        catch (err) {
            log.error("Error thrown in setProjectRoot: " + err.stack);
        }
    }
    if (/(\.ts|\.tsx)$/.test(fullPath) && !currentProjectRootHasConfig) {
        return callback(null, { errors: [] });
    }
    if (cli == null) {
        if (currentProjectRootHasConfig) {
            return callback(null, createUserError("ESLintError: You need to install ESLint in your project folder with 'npm install eslint'"));
        }
        else {
            return callback(null, createUserError("ESLintError: No ESLint cli is available, try reinstalling the extension"));
        }
    }
    var relativePath = fullPath.indexOf(projectRoot) === 0 ? fullPath.substring(projectRoot.length) : fullPath;
    var res;
    var err = null;
    try {
        res = cli.executeOnText(text, relativePath);
        res.eslintVersion = currentVersion;
    }
    catch (e) {
        log.error("Error thrown in executeOnText: " + e.stack);
        err = e;
        erroredLastTime = true;
    }
    return callback(err, res ? createCodeInspectionReport(res) : void 0);
}
exports.lintFile = lintFile;
function fixFile(projectRoot, fullPath, text, callback) {
    if (cli == null) {
        return callback(new Error("ESLintError: No ESLint cli is available, try reinstalling the extension"));
    }
    var res;
    var err = null;
    cli.options.fix = true;
    try {
        process.chdir(projectRoot);
        res = cli.executeOnText(text, fullPath);
        res.eslintVersion = currentVersion;
    }
    catch (e) {
        log.error(e.stack);
        err = e;
    }
    finally {
        cli.options.fix = false;
    }
    callback(err, res);
}
exports.fixFile = fixFile;
