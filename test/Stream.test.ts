"use strict";

import {assert} from "chai";
import * as nestore from "nestore-js-mongodb";
import * as nestoreMsg from "../index";
import * as mongodb from "mongodb";
import * as uuid from "uuid";

const mongodbConnection = "mongodb://localhost:27017/nestore-msg";

describe("Given a Stream", function() {
	this.slow(1300);
	this.timeout(20000);

	let bucketName: string;
	let stream: nestoreMsg.Stream<any>;

	beforeEach(function() {
		bucketName = makeId();
		stream = new nestoreMsg.Stream({
			url: mongodbConnection,
			waitInterval: 100,
			streamId: uuid.v4(),
			startingPoint: nestoreMsg.ReadStartingPoint.fromBeginning,
			bucket: bucketName });
	});

	afterEach(async function() {
		await cleanUpDatabase();
	});

	it("should be possile to write an event", async function() {
		await stream.write(async () => [{name: "ABC", body: "xyz"}]);
	});

	it("should be possile to subscribe to wait event", async function() {
		await new Promise((resolve, reject) => {
			stream.on("error", (err) => reject(err));
			stream.once("wait", (body) => resolve());
		});
	});

	describe("Given a subscriptor (once)", function() {
		const EVENT_A = "EA";
		let received: any[];
		beforeEach(function() {
			received = [];
			stream.once(EVENT_A, (body) => received.push(body));
		});

		it("should be possile to send one event and receive it", async function() {
			await stream.write(async () => [{name: EVENT_A, body: "x"}]);

			while (received.length !== 1) {
				await sleep(10);
			}
			assert.equal(received[0], "x");
		});

		it("should be possile to send many events and receive the first one", async function() {
			const COUNT = 100;
			for (let i = 0; i < COUNT; i++) {
				await stream.write(async () => [{name: EVENT_A, body: i}]);
			}

			while (received.length !== 1) {
				await sleep(10);
			}
			assert.equal(received[0], 0);
		});
	});

	describe("Given a subscriptor (on)", function() {
		const EVENT_B = "EB";
		let received: any[];
		beforeEach(function() {
			received = [];
			stream.on(EVENT_B, (body) => received.push(body));
		});

		it("should be possile to send one event and receive it", async function() {
			await stream.write(async () => [{name: EVENT_B, body: "x"}]);

			while (received.length !== 1) {
				await sleep(10);
			}
			assert.equal(received[0], "x");
		});

		it("should be possile to send many events and receive it in order", async function() {
			const COUNT = 100;
			for (let i = 0; i < COUNT; i++) {
				await stream.write(async () => [{name: EVENT_B, body: i}]);
			}

			while (received.length !== COUNT) {
				await sleep(10);
			}
			for (let i = 0; i < COUNT; i++) {
				assert.equal(received[i], i);
			}
		});
	});

	async function cleanUpDatabase() {
		if (!stream) {
			return;
		}
		await stream.disconnect();

		const eventStore = new nestore.EventStore({url: mongodbConnection});
		await eventStore.connect();
		const col = eventStore.mongoCollection(bucketName);
		try {
			await col.drop();
		} catch (err) {
			// ignore if not found...
		}
		if (eventStore.db) {
			const colCounters = eventStore.db.collection("counters");
			await colCounters.deleteOne({ _id: bucketName });
		}
	}
});

function makeId()	{
	let text = "";
	const possible = "abcdefghijklmnopqrstuvwxyz";

	for (let i = 0; i < 5; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}

	return text;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}
