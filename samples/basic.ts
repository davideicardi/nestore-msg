// tslint:disable:no-console

import * as nestoreMsg from "../index";
import * as uuid from "uuid";

const mongodbConnection = "mongodb://localhost:27017/nestore-msg";
const bucket = "basic";
const streamId = uuid.v4();

interface MyEvent {
	id: string;
	time: Date;
}
const stream = new nestoreMsg.Stream<MyEvent>({
	url: mongodbConnection, bucket, streamId });

stream.on("ping", (body) => {
	console.log("<== pong", body);
	stream.disconnect();
});

console.log("ping ==>");
stream.emit("ping", {x: "y"});

