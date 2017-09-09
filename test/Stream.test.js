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
const nestoreMsg = require("../index");
const uuid = require("uuid");
const mongodbConnection = "mongodb://localhost:27017/nestore-msg";
describe("Given a Stream", function () {
    this.slow(500);
    this.timeout(20000);
    let bucketName;
    let stream;
    beforeEach(function () {
        bucketName = makeId();
        stream = new nestoreMsg.Stream({
            url: mongodbConnection,
            waitInterval: 100,
            streamId: uuid.v4(),
            bucket: bucketName
        });
    });
    afterEach(function () {
        return __awaiter(this, void 0, void 0, function* () {
            yield cleanUpDatabase();
        });
    });
    it("should be possile to write events", function () {
        return __awaiter(this, void 0, void 0, function* () {
            yield stream.write(() => __awaiter(this, void 0, void 0, function* () { return [{ name: "A", body: "x" }]; }));
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
    describe("Given a new event", function () {
        beforeEach(function () {
            return __awaiter(this, void 0, void 0, function* () {
                yield stream.write(() => __awaiter(this, void 0, void 0, function* () { return [{ name: "A", body: "x" }]; }));
            });
        });
        it("should be possile to susbscribe to it", function () {
            return __awaiter(this, void 0, void 0, function* () {
                yield new Promise((resolve, reject) => {
                    stream.on("error", (err) => reject(err));
                    stream.on("A", (body) => body === "x" ? resolve() : reject("Invalid body " + body));
                });
            });
        });
        it("should be possile to susbscribe to it once", function () {
            return __awaiter(this, void 0, void 0, function* () {
                yield new Promise((resolve, reject) => {
                    stream.on("error", (err) => reject(err));
                    stream.once("A", (body) => body === "x" ? resolve() : reject("Invalid body " + body));
                });
            });
        });
        describe("Given another event", function () {
            beforeEach(function () {
                return __awaiter(this, void 0, void 0, function* () {
                    yield stream.write(() => __awaiter(this, void 0, void 0, function* () { return [{ name: "B", body: "y" }]; }));
                });
            });
            it("should be possile to susbscribe to it", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    yield new Promise((resolve, reject) => {
                        stream.on("error", (err) => reject(err));
                        stream.on("A", (body) => body === "x" ? resolve() : reject("Invalid body " + body));
                        stream.on("B", (body) => body === "y" ? resolve() : reject("Invalid body " + body));
                    });
                });
            });
            it("should be possile to susbscribe to it once", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    yield new Promise((resolve, reject) => {
                        stream.on("error", (err) => reject(err));
                        stream.once("A", (body) => body === "x" ? resolve() : reject("Invalid body " + body));
                        stream.once("B", (body) => body === "y" ? resolve() : reject("Invalid body " + body));
                    });
                });
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
//# sourceMappingURL=Stream.test.js.map