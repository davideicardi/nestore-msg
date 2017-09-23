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
const chai_1 = require("chai");
const nestore = require("nestore-js-mongodb");
const nestoreMsg = require("../index");
const uuid = require("uuid");
const mongodbConnection = "mongodb://localhost:27017/nestore-msg";
describe("Given a Stream", function () {
    this.slow(1300);
    this.timeout(20000);
    let bucketName;
    let stream;
    beforeEach(function () {
        bucketName = makeId();
        stream = new nestoreMsg.Stream({
            url: mongodbConnection,
            waitInterval: 100,
            streamId: uuid.v4(),
            startingPoint: nestoreMsg.ReadStartingPoint.fromBeginning,
            bucket: bucketName
        });
    });
    afterEach(function () {
        return __awaiter(this, void 0, void 0, function* () {
            yield cleanUpDatabase();
        });
    });
    it("should be possile to write an event", function () {
        return __awaiter(this, void 0, void 0, function* () {
            yield stream.write(() => __awaiter(this, void 0, void 0, function* () { return [{ name: "ABC", body: "xyz" }]; }));
        });
    });
    it("should be possile to subscribe to wait event", function () {
        return __awaiter(this, void 0, void 0, function* () {
            yield new Promise((resolve, reject) => {
                stream.on("error", (err) => reject(err));
                stream.once("wait", (body) => resolve());
            });
        });
    });
    describe("Given a subscriptor (once)", function () {
        const EVENT_A = "EA";
        let received;
        beforeEach(function () {
            received = [];
            stream.once(EVENT_A, (body) => received.push(body));
        });
        it("should be possile to send one event and receive it", function () {
            return __awaiter(this, void 0, void 0, function* () {
                yield stream.write(() => __awaiter(this, void 0, void 0, function* () { return [{ name: EVENT_A, body: "x" }]; }));
                while (received.length !== 1) {
                    yield sleep(10);
                }
                chai_1.assert.equal(received[0], "x");
            });
        });
        it("should be possile to send many events and receive the first one", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const COUNT = 100;
                for (let i = 0; i < COUNT; i++) {
                    yield stream.write(() => __awaiter(this, void 0, void 0, function* () { return [{ name: EVENT_A, body: i }]; }));
                }
                while (received.length !== 1) {
                    yield sleep(10);
                }
                chai_1.assert.equal(received[0], 0);
            });
        });
    });
    describe("Given a subscriptor (on)", function () {
        const EVENT_B = "EB";
        let received;
        beforeEach(function () {
            received = [];
            stream.on(EVENT_B, (body) => received.push(body));
        });
        it("should be possile to send one event and receive it", function () {
            return __awaiter(this, void 0, void 0, function* () {
                yield stream.write(() => __awaiter(this, void 0, void 0, function* () { return [{ name: EVENT_B, body: "x" }]; }));
                while (received.length !== 1) {
                    yield sleep(10);
                }
                chai_1.assert.equal(received[0], "x");
            });
        });
        it("should be possile to send many events and receive it in order", function () {
            return __awaiter(this, void 0, void 0, function* () {
                const COUNT = 100;
                for (let i = 0; i < COUNT; i++) {
                    yield stream.write(() => __awaiter(this, void 0, void 0, function* () { return [{ name: EVENT_B, body: i }]; }));
                }
                while (received.length !== COUNT) {
                    yield sleep(10);
                }
                for (let i = 0; i < COUNT; i++) {
                    chai_1.assert.equal(received[i], i);
                }
            });
        });
    });
    function cleanUpDatabase() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!stream) {
                return;
            }
            yield stream.disconnect();
            const eventStore = new nestore.EventStore({ url: mongodbConnection });
            yield eventStore.connect();
            const col = eventStore.mongoCollection(bucketName);
            try {
                yield col.drop();
            }
            catch (err) {
                // ignore if not found...
            }
            if (eventStore.db) {
                const colCounters = eventStore.db.collection("counters");
                yield colCounters.deleteOne({ _id: bucketName });
            }
        });
    }
});
function makeId() {
    let text = "";
    const possible = "abcdefghijklmnopqrstuvwxyz";
    for (let i = 0; i < 5; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
//# sourceMappingURL=Stream.test.js.map