"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const nestoreMsg = require("../index");
const mongodbConnection = "mongodb://localhost:27017/nestore-msg";
const bucket = "pingpong";
const streamId = "2a635734-44e0-46f1-8118-f2538e32debb";
const startingPoint = nestoreMsg.ReadStartingPoint.fromLast;
const waitInterval = 500;
const stream = new nestoreMsg.Stream({
    url: mongodbConnection, bucket, streamId, startingPoint, waitInterval
});
stream.on("ping", (x) => {
    // tslint:disable-next-line:no-console
    console.log("<== pong", x.id);
    stream.emit("pong", x);
});
// tslint:disable-next-line:no-console
console.log("Waiting for ping...");
//# sourceMappingURL=pong.js.map