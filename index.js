/**
 * Main build script.
 */
"use strict";


/**
 * Load modules.
 * @const {Module}
 */
const assert = require("assert");
const del = require("del");
const nanoAdblocker = require("./src/nano-adblocker.js");


(async () => {
    process.on("unhandledRejection", (e) => {
        throw e;
    });
    assert(/[\\/]NanoBuild$/.test(process.cwd()));

    let action = null;
    let target = null;
    let upstream = null;
    let pack = null;
    let publish = null;

    let argv = process.argv.slice(2);
    for (let arg of argv) {
        switch (arg) {
            case "--chromium":
                assert(action === null);
                action = "chromium";
                break;
            case "--firefox":
                assert(action === null);
                action = "firefox";
                break;
            case "--edge":
                assert(action === null);
                action = "edge";
                break;
            case "--clean":
                assert(action === null);
                action = "clean";
                break;

            case "--both":
                assert(target === null);
                target = "both";
                break;
            case "--adblocker":
                assert(target === null);
                target = "adblocker";
                break;
            case "--defender":
                assert(target === null);
                target = "defender";
                break;
            case "--ubo":
                assert(target === null);
                target = "ubo";
                break;

            case "--upstream":
                assert(upstream === null);
                upstream = true;
                break;
            case "--pack":
                assert(pack === null);
                pack = true;
                break;
            case "--publish":
                assert(publish === null);
                publish = true;
                break;

            case "--trace-fs":
                break;
            default:
                assert(false);
                break;
        }
    }
    assert(action !== null);
    if (target === null) {
        target = "both";
    }
    if (upstream === null) {
        upstream = false;
    }
    if (pack === null) {
        pack = false;
    }
    if (publish === null) {
        publish = false;
    }

    // https://nvd.nist.gov/vuln/detail/CVE-2018-3728
    if (action === "firefox") {
        throw new Error("Firefox build is disabled due to CVE-2018-3728");
    }

    if (action === "clean") {
        await del("./dist");
    } else {
        if (target === "both" || target === "adblocker") {
            await nanoAdblocker.buildCore(action, upstream);
            await nanoAdblocker.buildFilter(action, upstream);
            await nanoAdblocker.buildResources(action, upstream);
            await nanoAdblocker.buildLocale(action, upstream);

            if (pack || publish) {
                await nanoAdblocker.test(action, upstream);
                await nanoAdblocker.pack(action, upstream);
            }
            if (publish) {
                await nanoAdblocker.publish(action, upstream);
            }
        }

        if (target === "both" || target === "defender") {
            // TODO
            console.error("Nano Defender building is NOT yet implemented");
        }

        if (target === "ubo") {
            // TODO
            console.error("uBlock Origin Edge building is NOT yet implemented");
        }
    }
})();
