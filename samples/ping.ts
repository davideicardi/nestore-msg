import * as nestoreMsg from "../index";
import * as uuid from "uuid";

const mongodbConnection = "mongodb://localhost:27017/nestore-msg";
const bucket = "pingpong";
const streamId = "2a635734-44e0-46f1-8118-f2538e32debb";
const startingPoint = nestoreMsg.ReadStartingPoint.fromLast;
const waitInterval = 500;
interface PingEvent {
	id: number;
	time: Date;
}

const stream = new nestoreMsg.Stream<PingEvent>({
	url: mongodbConnection, bucket, streamId, startingPoint, waitInterval });

stream.on("pong", (x) => {
	const elapsed = new Date().getTime() - x.time.getTime();
	// tslint:disable-next-line:no-console
	console.log(`${x.id} received in ${elapsed}ms`);
});

let id = 1;
setInterval(() => {
	// tslint:disable-next-line:no-console
	console.log("ping ==>", id);
	stream.emit("ping", {id, time: new Date()});
	id++;
}, 5000);