"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const nestore = require("nestore-js-mongodb");
const MongoDb = require("mongodb");
const events_1 = require("events");
const Debug = require("debug");
const debug = Debug("nestore.msg");
var ReadStartingPoint;
(function (ReadStartingPoint) {
    ReadStartingPoint[ReadStartingPoint["fromBeginning"] = 1] = "fromBeginning";
    ReadStartingPoint[ReadStartingPoint["fromLast"] = 2] = "fromLast";
})(ReadStartingPoint = exports.ReadStartingPoint || (exports.ReadStartingPoint = {}));
const DEFAULT_WAIT_INTERVAL = 2000;
class Stream extends events_1.EventEmitter {
    constructor(options) {
        super();
        this.options = options;
    }
    disconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            const pr = this.projection;
            this.projection = undefined;
            const es = this.eventStore;
            this.bucket = undefined;
            this.eventStore = undefined;
            if (pr) {
                yield pr.close();
            }
            if (es) {
                yield es.close();
            }
        });
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.projection) {
                return;
            }
            if (this.connecting) {
                yield this.connecting;
                return;
            }
            this.connecting = this.connectAsync();
            try {
                yield this.connecting;
            }
            finally {
                this.connecting = undefined;
            }
        });
    }
    write(createCommit) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.connect();
            const bucket = this.bucket;
            if (!bucket) {
                throw new Error("Not initialized");
            }
            while (true) {
                try {
                    const events = yield createCommit();
                    if (events.length === 0) {
                        return;
                    }
                    // TODO: Check that events doesn't not have reserved name: error, wait, data, close
                    const expectedRevision = this.nextRevision;
                    if (expectedRevision === undefined) {
                        throw new Error("Invalid revision");
                    }
                    debug(`Writing commit for ${this.options.bucket}:${this.options.streamId}...`);
                    yield bucket.write(this.options.streamId, expectedRevision, events, { dispatched: true });
                    // try to adjust revision to avoid concurrency exception...
                    // but adjust it only if no other events are arrived (ie. revision is the same as before)
                    if (expectedRevision === this.nextRevision) {
                        this.nextRevision += events.length;
                    }
                    return; // done
                }
                catch (err) {
                    if (err instanceof nestore.ConcurrencyError) {
                        debug(`Concurrency error while writing events for ${this.options.bucket}:${this.options.streamId}, retrying...`);
                        yield this.waitConcurrency();
                    }
                    else {
                        throw err;
                    }
                }
            }
        });
    }
    emit(event, body) {
        if (event === "error") {
            return super.emit(event, body);
        }
        const bodyT = body;
        this.write(() => __awaiter(this, void 0, void 0, function* () { return [{ name: event, body: bodyT }]; }))
            .catch((err) => super.emit("error", err));
        return this.eventNames().indexOf(event) >= 0;
    }
    addListener(event, listener) {
        this.connectSync();
        return super.addListener(event, listener);
    }
    on(event, listener) {
        this.connectSync();
        return super.on(event, listener);
    }
    once(event, listener) {
        this.connectSync();
        return super.once(event, listener);
    }
    prependListener(event, listener) {
        this.connectSync();
        return super.prependListener(event, listener);
    }
    prependOnceListener(event, listener) {
        this.connectSync();
        return super.prependOnceListener(event, listener);
    }
    removeListener(event, listener) {
        this.connectSync();
        return super.removeListener(event, listener);
    }
    waitConcurrency() {
        // wait and retry
        const waitConcurrency = (this.options.waitInterval || DEFAULT_WAIT_INTERVAL) / 10;
        return this.sleep(waitConcurrency);
    }
    connectSync() {
        this.connect()
            .catch((err) => super.emit("error", err));
    }
    connectAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.connectToBucket();
            yield this.connectToProjection();
        });
    }
    connectToBucket() {
        return __awaiter(this, void 0, void 0, function* () {
            const es = new nestore.EventStore(this.options);
            yield es.connect();
            this.eventStore = es;
            this.bucket = es.bucket(this.options.bucket);
        });
    }
    connectToProjection() {
        const _super = name => super[name];
        return __awaiter(this, void 0, void 0, function* () {
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
                const lastCommit = yield bucket.lastCommit({ streamId });
                if (lastCommit) {
                    lastStreamRevision = lastCommit.StreamRevisionEnd;
                    fromBucketRevision = lastCommit._id + 1;
                }
            }
            this.nextRevision = lastStreamRevision;
            debug(`Start reading projection for ${this.options.bucket}:${streamId} from ${fromBucketRevision}`);
            this.projection = bucket.projectionStream({ streamId, fromBucketRevision }, { waitInterval, readPreference: MongoDb.ReadPreference.SECONDARY_PREFERRED });
            this.projection
                .on("data", (doc) => {
                this.applyCommit(doc);
            })
                .on("error", (err) => _super("emit").call(this, "error", err))
                .on("wait", () => _super("emit").call(this, "wait", {}))
                .on("close", () => { });
        });
    }
    applyCommit(commit) {
        if (!this.nextRevision || commit.StreamRevisionEnd > this.nextRevision) {
            this.nextRevision = commit.StreamRevisionEnd;
        }
        for (const e of commit.Events) {
            super.emit(e.name, e.body);
        }
    }
    sleep(ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }
}
exports.Stream = Stream;
//# sourceMappingURL=index.js.map