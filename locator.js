'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var paths = require("path");
var shell_1 = require("./shell");
function parseVersion(raw) {
    return raw.replace(/^git version /, '');
}
function findSpecificGit(path) {
    return __awaiter(this, void 0, void 0, function () {
        var version, foundPath;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, shell_1.run(path, ['--version'], 'utf8')];
                case 1:
                    version = _a.sent();
                    if (!(!path || path === 'git')) return [3 /*break*/, 3];
                    foundPath = shell_1.findExecutable(path, ['--version']).cmd;
                    return [4 /*yield*/, shell_1.run(foundPath, ['--version'], 'utf8')];
                case 2:
                    // Ensure that the path we found works
                    version = _a.sent();
                    path = foundPath;
                    _a.label = 3;
                case 3: return [2 /*return*/, {
                        path: path,
                        version: parseVersion(version.trim())
                    }];
            }
        });
    });
}
function findGitDarwin() {
    return __awaiter(this, void 0, void 0, function () {
        var path, ex_1, ex_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, , 7]);
                    return [4 /*yield*/, shell_1.run('which', ['git'], 'utf8')];
                case 1:
                    path = _a.sent();
                    path = path.replace(/^\s+|\s+$/g, '');
                    if (path !== '/usr/bin/git') {
                        return [2 /*return*/, findSpecificGit(path)];
                    }
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, shell_1.run('xcode-select', ['-p'], 'utf8')];
                case 3:
                    _a.sent();
                    return [2 /*return*/, findSpecificGit(path)];
                case 4:
                    ex_1 = _a.sent();
                    if (ex_1.code === 2) {
                        return [2 /*return*/, Promise.reject(new Error('Unable to find git'))];
                    }
                    return [2 /*return*/, findSpecificGit(path)];
                case 5: return [3 /*break*/, 7];
                case 6:
                    ex_2 = _a.sent();
                    return [2 /*return*/, Promise.reject(new Error('Unable to find git'))];
                case 7: return [2 /*return*/];
            }
        });
    });
}
function findSystemGitWin32(basePath) {
    if (basePath == null || basePath.length === 0)
        return Promise.reject(new Error('Unable to find git'));
    return findSpecificGit(paths.join(basePath, 'Git', 'cmd', 'git.exe'));
}
function findGitWin32() {
    return findSystemGitWin32(process.env['ProgramW6432'])
        .then(null, function () { return findSystemGitWin32(process.env['ProgramFiles(x86)']); })
        .then(null, function () { return findSystemGitWin32(process.env['ProgramFiles']); })
        .then(null, function () { return findSpecificGit('git'); });
}
function findGitPath(path) {
    return __awaiter(this, void 0, void 0, function () {
        var ex_3, _a, ex_4;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 12]);
                    return [4 /*yield*/, findSpecificGit(path || 'git')];
                case 1: return [2 /*return*/, _b.sent()];
                case 2:
                    ex_3 = _b.sent();
                    _b.label = 3;
                case 3:
                    _b.trys.push([3, 10, , 11]);
                    _a = process.platform;
                    switch (_a) {
                        case 'darwin': return [3 /*break*/, 4];
                        case 'win32': return [3 /*break*/, 6];
                    }
                    return [3 /*break*/, 8];
                case 4: return [4 /*yield*/, findGitDarwin()];
                case 5: return [2 /*return*/, _b.sent()];
                case 6: return [4 /*yield*/, findGitWin32()];
                case 7: return [2 /*return*/, _b.sent()];
                case 8: return [2 /*return*/, Promise.reject('Unable to find git')];
                case 9: return [3 /*break*/, 11];
                case 10:
                    ex_4 = _b.sent();
                    return [2 /*return*/, Promise.reject(new Error('Unable to find git'))];
                case 11: return [3 /*break*/, 12];
                case 12: return [2 /*return*/];
            }
        });
    });
}
exports.findGitPath = findGitPath;
