"use strict";
// tslint:disable:no-console
Object.defineProperty(exports, "__esModule", { value: true });
const nestoreMsg = require("../index");
const uuid = require("uuid");
const mongodbConnection = "mongodb://localhost:27017/nestore-msg";
const bucket = "basic";
const streamId = uuid.v4();
const stream = new nestoreMsg.Stream({
    url: mongodbConnection, bucket, streamId
});
stream.on("ping", (body) => {
    console.log("<== pong", body);
    stream.disconnect();
});
console.log("ping ==>");
stream.emit("ping", { x: "y" });
//# sourceMappingURL=basic.js.map