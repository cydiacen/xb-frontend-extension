'use strict';
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
exports.__esModule = true;
var child_process_1 = require("child_process");
var fs = require("fs");
var paths = require("path");
var iconv = require("iconv-lite");
exports.isWindows = process.platform === 'win32';
var slashesRegex = /[\\/]/;
var ps1Regex = /\.ps1$/i;
var batOrCmdRegex = /\.(bat|cmd)$/i;
var jsRegex = /\.(js)$/i;
/**
 * Search PATH to see if a file exists in any of the path folders.
 *
 * @param  {string} exe The file to search for
 * @return {string}     A fully qualified path, or the original path if nothing
 *                      is found
 *
 * @private
 */
function runDownPath(exe) {
    // NB: Windows won't search PATH looking for executables in spawn like
    // Posix does
    // Files with any directory path don't get this applied
    if (slashesRegex.test(exe))
        return exe;
    var target = paths.join('.', exe);
    try {
        var stats = fs.statSync(target);
        if (stats && stats.isFile() && isExecutable(stats))
            return target;
    }
    catch (_a) { }
    var path = process.env.PATH;
    if (path != null && path.length !== 0) {
        var haystack = path.split(exports.isWindows ? ';' : ':');
        var stats = void 0;
        for (var _i = 0, haystack_1 = haystack; _i < haystack_1.length; _i++) {
            var p = haystack_1[_i];
            var needle = paths.join(p, exe);
            try {
                stats = fs.statSync(needle);
                if (stats && stats.isFile() && isExecutable(stats))
                    return needle;
            }
            catch (_b) { }
        }
    }
    return exe;
}
function isExecutable(stats) {
    if (exports.isWindows)
        return true;
    var isGroup = stats.gid ? process.getgid && stats.gid === process.getgid() : true;
    var isUser = stats.uid ? process.getuid && stats.uid === process.getuid() : true;
    return Boolean(stats.mode & 1 || (stats.mode & 8 && isGroup) || (stats.mode & 64 && isUser));
}
/**
 * Finds the executable and parameters to run on Windows. This method
 * mimics the POSIX behavior of being able to run scripts as executables by
 * replacing the passed-in executable with the script runner, for PowerShell,
 * CMD, and node scripts.
 *
 * This method also does the work of running down PATH, which spawn on Windows
 * also doesn't do, unlike on POSIX.
 */
function findExecutable(exe, args) {
    // POSIX can just execute scripts directly, no need for silly goosery
    if (!exports.isWindows)
        return { cmd: runDownPath(exe), args: args };
    if (!fs.existsSync(exe)) {
        // NB: When you write something like `surf-client ... -- surf-build` on Windows,
        // a shell would normally convert that to surf-build.cmd, but since it's passed
        // in as an argument, it doesn't happen
        var possibleExts = ['.exe', '.bat', '.cmd', '.ps1'];
        for (var _i = 0, possibleExts_1 = possibleExts; _i < possibleExts_1.length; _i++) {
            var ext = possibleExts_1[_i];
            var possibleFullPath = runDownPath("" + exe + ext);
            if (fs.existsSync(possibleFullPath))
                return findExecutable(possibleFullPath, args);
        }
    }
    if (ps1Regex.test(exe)) {
        var cmd = paths.join(process.env.SYSTEMROOT || 'C:\\WINDOWS', 'System32', 'WindowsPowerShell', 'v1.0', 'PowerShell.exe');
        var psargs = ['-ExecutionPolicy', 'Unrestricted', '-NoLogo', '-NonInteractive', '-File', exe];
        return { cmd: cmd, args: psargs.concat(args) };
    }
    if (batOrCmdRegex.test(exe)) {
        var cmd = paths.join(process.env.SYSTEMROOT || 'C:\\WINDOWS', 'System32', 'cmd.exe');
        var cmdArgs = ['/C', exe].concat(args);
        return { cmd: cmd, args: cmdArgs };
    }
    if (jsRegex.test(exe)) {
        var cmd = process.execPath;
        var nodeArgs = [exe];
        return { cmd: cmd, args: nodeArgs.concat(args) };
    }
    return { cmd: exe, args: args };
}
exports.findExecutable = findExecutable;
var bufferExceededRegex = /stdout maxBuffer( length)? exceeded/;
function run(command, args, encoding, options) {
    if (options === void 0) { options = {}; }
    var _a = __assign({ maxBuffer: 100 * 1024 * 1024 }, options), stdin = _a.stdin, stdinEncoding = _a.stdinEncoding, opts = __rest(_a, ["stdin", "stdinEncoding"]);
    return new Promise(function (resolve, reject) {
        var proc = child_process_1.execFile(command, args, opts, function (error, stdout, stderr) {
            if (error != null) {
                if (bufferExceededRegex.test(error.message)) {
                    error.message = "Command output exceeded the allocated stdout buffer. Set 'options.maxBuffer' to a larger value than " + opts.maxBuffer + " bytes";
                }
                error.stdout =
                    encoding === 'utf8' || encoding === 'binary' || encoding === 'buffer'
                        ? stdout
                        : iconv.decode(Buffer.from(stdout, 'binary'), encoding);
                reject(error);
                return;
            }
            // if (stderr) {
            //     Logger.warn(`Warning(${command} ${args.join(' ')}): ${stderr}`);
            // }
            resolve(encoding === 'utf8' || encoding === 'binary' || encoding === 'buffer'
                ? stdout
                : iconv.decode(Buffer.from(stdout, 'binary'), encoding));
        });
        if (stdin) {
            proc.stdin.end(stdin, stdinEncoding || 'utf8');
        }
    });
}
exports.run = run;
