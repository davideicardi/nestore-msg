# nestore-msg

Send, receive and store messages using MongoDb, allowing (micro)service communication.

## Installation

    npm install nestore-msg

## Basic usage

    import * as nestoreMsg from "nestore-msg";
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

The `Stream` class is an extension of Node.Js `EventEmitter` class, with all the standard methods.