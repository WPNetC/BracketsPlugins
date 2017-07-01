"use strict";
var esLint = require("./eslint");
var PackageJson = require('../../package.json');
var EXTENSION_NAME = PackageJson.name;
var EXTENSION_UNIQUE_NAME = 'zaggino.' + EXTENSION_NAME;
var domainName = EXTENSION_UNIQUE_NAME;
var domainManager;
exports.init = function (_domainManager) {
    domainManager = _domainManager;
    if (!domainManager.hasDomain(domainName)) {
        domainManager.registerDomain(domainName, { major: 0, minor: 1 });
    }
    domainManager.registerCommand(domainName, 'lintFile', esLint.lintFile, true, 'lint given file with eslint', [
        { name: 'projectRoot', type: 'string' },
        { name: 'fullPath', type: 'string' },
        { name: 'text', type: 'string' },
    ], [
        { name: 'report', type: 'object' }
    ]);
    domainManager.registerCommand(domainName, 'fixFile', esLint.fixFile, true, 'Fixes the current file using the ESLint auto-fixing feature', [
        { name: 'projectRoot', type: 'string' },
        { name: 'fullPath', type: 'string' },
        { name: 'text', type: 'string' }
    ]);
};
