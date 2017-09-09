/// <reference types="node" />
import * as nestore from "nestore-js-mongodb";
import { EventEmitter } from "events";
export interface StreamOptions extends nestore.EventStoreOptions {
    bucket: string;
    streamId: string;
}
export interface EventData<T> {
    name: string;
    body: T;
}
export declare type CreateCommit<T> = () => Promise<Array<EventData<T>>>;
export declare class Stream<T> extends EventEmitter {
    readonly options: StreamOptions;
    private eventStore?;
    private bucket?;
    constructor(options: StreamOptions);
    commit(createCommit: CreateCommit<T>): Promise<void>;
    disconnect(): Promise<void>;
    connect(): Promise<void>;
    private _connect();
}
