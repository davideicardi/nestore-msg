"use strict";

import {assert} from "chai";
import * as nestore from "nestore-js-mongodb";
import * as nestoreMsg from "../index";
import * as mongodb from "mongodb";
import * as uuid from "uuid";

const mongodbConnection = "mongodb://localhost:27017/nestore-msg";

describe("Given a Stream", function() {
	this.slow(500);
	this.timeout(20000);

	let bucketName: string;
	let stream: nestoreMsg.Stream<any>;

	beforeEach(function() {
		bucketName = makeId();
		stream = new nestoreMsg.Stream({
			url: mongodbConnection,
			waitInterval: 100,
			streamId: uuid.v4(),
			bucket: bucketName });
	});

	afterEach(async function() {
		await cleanUpDatabase();
	});

	it("should be possile to write events", async function() {
		await stream.write(async () => [{name: "A", body: "x"}]);
	});

	it("should be possile to subscribe to wait event", async function() {
		await new Promise((resolve, reject) => {
			stream.on("error", (err) => reject(err));
			stream.once("wait", (body) => resolve());
		});
	});

	describe("Given a new event", function() {
		beforeEach(async function() {
			await stream.write(async () => [{name: "A", body: "x"}]);
		});

		it("should be possile to susbscribe to it", async function() {
			await new Promise((resolve, reject) => {
				stream.on("error", (err) => reject(err));
				stream.on("A", (body) => body === "x" ? resolve() : reject("Invalid body " + body));
			});
		});

		it("should be possile to susbscribe to it once", async function() {
			await new Promise((resolve, reject) => {
				stream.on("error", (err) => reject(err));
				stream.once("A", (body) => body === "x" ? resolve() : reject("Invalid body " + body));
			});
		});

		describe("Given another event", function() {
			beforeEach(async function() {
				await stream.write(async () => [{name: "B", body: "y"}]);
			});

			it("should be possile to susbscribe to it", async function() {
				await new Promise((resolve, reject) => {
					stream.on("error", (err) => reject(err));
					stream.on("A", (body) => body === "x" ? resolve() : reject("Invalid body " + body));
					stream.on("B", (body) => body === "y" ? resolve() : reject("Invalid body " + body));
				});
			});

			it("should be possile to susbscribe to it once", async function() {
				await new Promise((resolve, reject) => {
					stream.on("error", (err) => reject(err));
					stream.once("A", (body) => body === "x" ? resolve() : reject("Invalid body " + body));
					stream.once("B", (body) => body === "y" ? resolve() : reject("Invalid body " + body));
				});
			});
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
