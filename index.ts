import {EventStore, ProjectionStream, Bucket, CommitData} from "nestore-js-mongodb";
import * as MongoDb from "mongodb";
import {EventEmitter} from "events";

import * as Debug from "debug";
const debug = Debug("nestore.msg");

