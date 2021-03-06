import * as nestore from "nestore-js-mongodb";
import * as MongoDb from "mongodb";
import {EventEmitter} from "events";

import * as Debug from "debug";
const debug = Debug("nestore.msg");

export enum ReadStartingPoint {
	fromBeginning = 1,
	fromLast = 2
}

export interface StreamOptions extends nestore.EventStoreOptions {
	bucket: string;
	streamId: string;
	waitInterval?: number;
	startingPoint?: ReadStartingPoint;
}

export interface EventData<T> {
	name: string | symbol;
	body: T;
}

export type CreateCommit<T> = () => Promise<Array<EventData<T>>>;

const DEFAULT_WAIT_INTERVAL = 2000;

export class Stream<T> extends EventEmitter {
	private eventStore?: nestore.EventStore;
	private bucket?: nestore.Bucket;
	private projection?: nestore.ProjectionStream;
	private nextRevision?: number;
	private connecting?: Promise<void>;

	constructor(readonly options: StreamOptions) {
		super();
	}

	async disconnect(): Promise<void> {
		const pr = this.projection;
		this.projection = undefined;

		const es = this.eventStore;
		this.bucket = undefined;
		this.eventStore = undefined;

		if (pr) {
			await pr.close();
		}

		if (es) {
			await es.close();
		}
	}

	async connect(): Promise<void> {
		if (this.projection) {
			return;
		}

		if (this.connecting) {
			await this.connecting;
			return;
		}

		this.connecting = this.connectAsync();
		try {
			await this.connecting;
		} finally {
			this.connecting = undefined;
		}
	}

	async write(createCommit: CreateCommit<T>): Promise<void> {
		await this.connect();
		const bucket = this.bucket;
		if (!bucket) {
			throw new Error("Not initialized");
		}

		while (true) {
			try {
				const events = await createCommit();
				if (events.length === 0) {
					return;
				}
				// TODO: Check that events doesn't not have reserved name: error, wait, data, close

				const expectedRevision = this.nextRevision;
				if (expectedRevision === undefined) {
					throw new Error("Invalid revision");
				}

				debug(`Writing commit for ${this.options.bucket}:${this.options.streamId}...`);
				await bucket.write(this.options.streamId, expectedRevision, events, { dispatched: true });

				// try to adjust revision to avoid concurrency exception...
				// but adjust it only if no other events are arrived (ie. revision is the same as before)
				if (expectedRevision === this.nextRevision) {
					this.nextRevision += events.length;
				}

				return; // done
			} catch (err) {
				if (err instanceof nestore.ConcurrencyError) {
					debug(`Concurrency error while writing events for ${this.options.bucket}:${this.options.streamId}, retrying...`);
					await this.waitConcurrency();
				} else {
					throw err;
				}
			}
		}
	}

	emit(event: string | symbol, body: T | Error | {}): boolean {
		if (event === "error") {
			return super.emit(event, body);
		}

		const bodyT = body as T;

		this.write(async () => [{name: event, body: bodyT}])
		.catch((err: any) => super.emit("error", err));

		return this.eventNames().indexOf(event) >= 0;
	}
	addListener(event: string | symbol, listener: (body: T) => void): this {
		this.connectSync();
		return super.addListener(event, listener);
	}
	on(event: string | symbol, listener: (body: T) => void): this {
		this.connectSync();
		return super.on(event, listener);
	}
	once(event: string | symbol, listener: (body: T) => void): this {
		this.connectSync();
		return super.once(event, listener);
	}
	prependListener(event: string | symbol, listener: (body: T) => void): this {
		this.connectSync();
		return super.prependListener(event, listener);
	}
	prependOnceListener(event: string | symbol, listener: (body: T) => void): this {
		this.connectSync();
		return super.prependOnceListener(event, listener);
	}
	removeListener(event: string | symbol, listener: (body: T) => void): this {
		this.connectSync();
		return super.removeListener(event, listener);
	}

	private waitConcurrency() {
		// wait and retry
		const waitConcurrency = (this.options.waitInterval || DEFAULT_WAIT_INTERVAL) / 10;
		return this.sleep(waitConcurrency);
	}

	private connectSync(): void {
		this.connect()
		.catch((err) => super.emit("error", err));
	}

	private async connectAsync(): Promise<void> {
		await this.connectToBucket();
		await this.connectToProjection();
	}

	private async connectToBucket(): Promise<void> {
		const es = new nestore.EventStore(this.options);
		await es.connect();
		this.eventStore = es;
		this.bucket = es.bucket(this.options.bucket);
	}

	private async connectToProjection(): Promise<void> {
		const bucket = this.bucket;
		if (!bucket) {
			throw new Error("Not initialized");
		}

		const streamId = this.options.streamId;
		const waitInterval = this.options.waitInterval || DEFAULT_WAIT_INTERVAL;
		const startingPoint = this.options.startingPoint || ReadStartingPoint.fromBeginning;

		let fromBucketRevision = 0;
		let lastStreamRevision = 0;
		if (startingPoint === ReadStartingPoint.fromLast) {
			const lastCommit = await bucket.lastCommit({ streamId });
			if (lastCommit) {
				lastStreamRevision = lastCommit.StreamRevisionEnd;
				fromBucketRevision = lastCommit._id + 1;
			}
		}
		this.nextRevision = lastStreamRevision;

		debug(`Start reading projection for ${this.options.bucket}:${streamId} from ${fromBucketRevision}`);

		this.projection = bucket.projectionStream(
			{ streamId, fromBucketRevision },
			{ waitInterval, readPreference: MongoDb.ReadPreference.SECONDARY_PREFERRED });
		this.projection
		.on("data", (doc: nestore.CommitData) => {
			this.applyCommit(doc);
		})
		.on("error", (err) => super.emit("error", err))
		.on("wait", () => super.emit("wait", {}))
		.on("close", () => {});
	}

	private applyCommit(commit: nestore.CommitData) {
		if (!this.nextRevision || commit.StreamRevisionEnd > this.nextRevision) {
			this.nextRevision = commit.StreamRevisionEnd;
		}
		for (const e of commit.Events as Array<EventData<T>>) {
			super.emit(e.name, e.body);
		}
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => {
			setTimeout(resolve, ms);
		});
	}
}
