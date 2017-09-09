import * as nestore from "nestore-js-mongodb";
import * as MongoDb from "mongodb";
import {EventEmitter} from "events";

import * as Debug from "debug";
const debug = Debug("nestore.msg");

export interface StreamOptions extends nestore.EventStoreOptions {
	bucket: string;
	streamId: string;
}

export interface EventData<T> {
	name: string;
	body: T;
}

export type CreateCommit<T> = () => Promise<Array<EventData<T>>>;

export class Stream<T> extends EventEmitter {
	private eventStore?: nestore.EventStore;
	private bucket?: nestore.Bucket;

	constructor(readonly options: StreamOptions) {
		super();
	}

	async commit(createCommit: CreateCommit<T>) {
		const bucket = await this._connect();

		// TODO Handle concurrency...
		const expectedStreamRevision = await bucket.streamRevision(this.options.streamId);
		const events = await createCommit();
		await bucket.write(this.options.streamId, expectedStreamRevision, events, { dispatched: true });
	}

	async disconnect() {
		if (!this.bucket || !this.eventStore) {
			return;
		}

		const es = this.eventStore;
		this.bucket = undefined;
		this.eventStore = undefined;

		await es.close();
	}

	async connect() {
		await this._connect();
	}

	private async _connect(): Promise<nestore.Bucket> {
		if (this.bucket) {
			return this.bucket;
		}

		const es = new nestore.EventStore(this.options);
		await es.connect();
		this.eventStore = es;
		this.bucket = es.bucket(this.options.bucket);

		return this.bucket;
	}
}
