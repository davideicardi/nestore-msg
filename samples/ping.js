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
const instanceId = makeId();
let receivedCount = 0;
stream.on("pong", (x) => {
    receivedCount++;
    const elapsed = new Date().getTime() - x.time.getTime();
    // tslint:disable-next-line:no-console
    console.log(`${x.id} received in ${elapsed}ms from ${x.instanceId} (tot: ${receivedCount})`);
});
for (let id = 0; id < 10; id++) {
    // tslint:disable-next-line:no-console
    console.log("ping ==>", id);
    stream.emit("ping", { id, instanceId, time: new Date() });
}
// let id = 1;
// setInterval(() => {
// 	// tslint:disable-next-line:no-console
// 	console.log("ping ==>", id);
// 	stream.emit("ping", {id, instanceId, time: new Date()});
// 	id++;
// }, 200);
function makeId() {
    let text = "";
    const possible = "abcdefghijklmnopqrstuvwxyz";
    for (let i = 0; i < 5; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
//# sourceMappingURL=ping.js.map