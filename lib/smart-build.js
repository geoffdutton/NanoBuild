/**
 * Smart build library
 */
"use strict";

/**
 * Load modules.
 * @const {Module}
 */
const assert = require("assert");
const fs = require("./promise-fs.js");

/**
 * Create directory if does not exist.
 * @async @function
 * @param {string} dir - The directory path.
 */
exports.createDirectory = async (dir) => {
    let dirStat;
    try {
        dirStat = await fs.lstat(dir);
    } catch (e) {
        assert(e.code === "ENOENT");
        await fs.mkdir(dir);
    }
    if (dirStat) {
        assert(dirStat.isDirectory() && !dirStat.isSymbolicLink());
    }
};

/**
 * Call a function if output is outdated.
 * @async @function
 * @param {Array.<string>} dependencies - Paths to dependencies of the output file.
 * @param {string} output - The path to the output file.
 * @param {AsyncFunction} build - The build function.
 * @param {...Any} [passback=undefined] - The argument to pass back to the build function.
 */
exports.buildFile = async (dependencies, output, build, ...passback) => {
    let stats = [];
    for (let dependency of dependencies) {
        stats.push(fs.lstat(dependency));
    }
    stats.push(fs.lstat(output));

    let dependenciesStat, outputStat;
    try {
        dependenciesStat = await Promise.all(stats);
        outputStat = dependenciesStat.pop();
    } catch (e) {
        assert(e.code === "ENOENT");
        await build(...passback);
        return;
    }

    assert(outputStat.isFile() && !outputStat.isSymbolicLink());
    let mustRebuild = false;
    for (let dependencyStat of dependenciesStat) {
        assert(dependencyStat.isFile() && !dependencyStat.isSymbolicLink());
        if (dependencyStat.mtimeMs > outputStat.mtimeMs) {
            mustRebuild = true;
            // Do not break, as we need to assert the rest of the files
        }
    }

    if (mustRebuild) {
        await build(...passback);
    }
};
/**
 * Copy source file to target and overwrite it if source file is newer.
 * @async @function
 * @param {string} source - The path to the source file.
 * @param {string} target - The path to the target file.
 */
exports.copyFile = async (source, target) => {
    let sourceStat, targetStat;
    try {
        [sourceStat, targetStat] = await Promise.all([
            fs.lstat(source),
            fs.lstat(target),
        ]);
    } catch (e) {
        assert(e.code === "ENOENT");
        await fs.copyFile(source, target);
        return;
    }

    assert(sourceStat.isFile() && !sourceStat.isSymbolicLink());
    assert(targetStat.isFile() && !targetStat.isSymbolicLink());

    if (sourceStat.mtimeMs > targetStat.mtimeMs) {
        await fs.copyFile(source, target);
    }
};
/**
 * Scan into source directory, and smart copy files into target directory.
 * ".old" files will not be copied.
 * @async @function
 * @param {string} source - The path to the source directory.
 * @param {string} target - The path to the target directory.
 * @param {boolean} [deep=true] - Whether subdirectories should be copied too.
 */
exports.copyDirectory = async (source, target, deep = true) => {
    await exports.createDirectory(target);

    const files = await fs.readdir(source);

    let tasks = [];
    for (let i = 0; i < files.length; i++) {
        tasks.push(fs.lstat(source + "/" + files[i]));
    }
    tasks = await Promise.all(tasks);
    assert(files.length === tasks.length);

    let copyTasks = [];
    for (let i = 0; i < tasks.length; i++) {
        assert(!tasks[i].isSymbolicLink());

        if (tasks[i].isDirectory()) {
            if (deep) {
                // One directory at a time to make sure things will not get overloaded
                await exports.copyDirectory(source + "/" + files[i], target + "/" + files[i]);
            }
            continue;
        }

        assert(tasks[i].isFile());
        if (!files[i].endsWith(".old")) {
            copyTasks.push(exports.copyFile(source + "/" + files[i], target + "/" + files[i]));
        }
    }
    await Promise.all(copyTasks);
};