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
const events_1 = require("events");
const Debug = require("debug");
const debug = Debug("nestore.msg");
class Stream extends events_1.EventEmitter {
    constructor(options) {
        super();
        this.options = options;
    }
    commit(createCommit) {
        return __awaiter(this, void 0, void 0, function* () {
            const bucket = yield this._connect();
            // TODO Handle concurrency...
            const expectedStreamRevision = yield bucket.streamRevision(this.options.streamId);
            const events = yield createCommit();
            yield bucket.write(this.options.streamId, expectedStreamRevision, events, { dispatched: true });
        });
    }
    disconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.bucket || !this.eventStore) {
                return;
            }
            const es = this.eventStore;
            this.bucket = undefined;
            this.eventStore = undefined;
            yield es.close();
        });
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._connect();
        });
    }
    _connect() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.bucket) {
                return this.bucket;
            }
            const es = new nestore.EventStore(this.options);
            yield es.connect();
            this.eventStore = es;
            this.bucket = es.bucket(this.options.bucket);
            return this.bucket;
        });
    }
}
exports.Stream = Stream;
//# sourceMappingURL=index.js.map