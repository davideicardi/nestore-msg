// tslint:disable:no-console

import * as nestoreMsg from "../index";
import * as uuid from "uuid";
import {ProgressLogger} from "progress-logger-js";

const progress = new ProgressLogger();

const mongodbConnection = "mongodb://localhost:27017/nestore-msg";
const bucket = "pingpong";
const streamId = "2a635734-44e0-46f1-8118-f2538e32debb";
const startingPoint = nestoreMsg.ReadStartingPoint.fromLast;
const waitInterval = 500;

interface PingEvent {
	id: string;
	time: Date;
}

const stream = new nestoreMsg.Stream<PingEvent>({
	url: mongodbConnection, bucket, streamId, startingPoint, waitInterval });

stream.on("ping", (x) => {
	progress.increment();
	stream.emit("pong", x);
});

console.log("Waiting for ping...");
