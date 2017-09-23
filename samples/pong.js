"use strict";
// tslint:disable:no-console
Object.defineProperty(exports, "__esModule", { value: true });
const nestoreMsg = require("../index");
const progress_logger_js_1 = require("progress-logger-js");
const progress = new progress_logger_js_1.ProgressLogger();
const mongodbConnection = "mongodb://localhost:27017/nestore-msg";
const bucket = "pingpong";
const streamId = "2a635734-44e0-46f1-8118-f2538e32debb";
const startingPoint = nestoreMsg.ReadStartingPoint.fromLast;
const waitInterval = 500;
const stream = new nestoreMsg.Stream({
    url: mongodbConnection, bucket, streamId, startingPoint, waitInterval
});
stream.on("ping", (x) => {
    progress.increment();
    stream.emit("pong", x);
});
console.log("Waiting for ping...");
//# sourceMappingURL=pong.js.map