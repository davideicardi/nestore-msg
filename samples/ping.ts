// tslint:disable:no-console

import * as nestoreMsg from "../index";

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

let currentId: string = "";

stream.on("pong", (x) => {
	if (currentId !== x.id) {
		return;
	}

	const elapsed = new Date().getTime() - x.time.getTime();
	console.log(`<== pong (${elapsed}ms)`);

	ping(makeId());
});

ping(makeId());

function ping(id: string) {
	currentId = id;

	console.log("ping ==>", id);
	stream.emit("ping", {id, time: new Date()});
}

function makeId()	{
	let text = "";
	const possible = "abcdefghijklmnopqrstuvwxyz0123456789";

	for (let i = 0; i < 5; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}

	return text;
}
