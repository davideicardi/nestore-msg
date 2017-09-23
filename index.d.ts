/// <reference types="node" />
import * as nestore from "nestore-js-mongodb";
import { EventEmitter } from "events";
export declare enum ReadStartingPoint {
    fromBeginning = 1,
    fromLast = 2,
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
export declare type CreateCommit<T> = () => Promise<Array<EventData<T>>>;
export declare class Stream<T> extends EventEmitter {
    readonly options: StreamOptions;
    private eventStore?;
    private bucket?;
    private projection?;
    private nextRevision?;
    private connecting?;
    constructor(options: StreamOptions);
    disconnect(): Promise<void>;
    connect(): Promise<void>;
    write(createCommit: CreateCommit<T>): Promise<void>;
    emit(event: string | symbol, body: T | Error | {}): boolean;
    addListener(event: string | symbol, listener: (body: T) => void): this;
    on(event: string | symbol, listener: (body: T) => void): this;
    once(event: string | symbol, listener: (body: T) => void): this;
    prependListener(event: string | symbol, listener: (body: T) => void): this;
    prependOnceListener(event: string | symbol, listener: (body: T) => void): this;
    removeListener(event: string | symbol, listener: (body: T) => void): this;
    private waitConcurrency();
    private connectSync();
    private connectAsync();
    private connectToBucket();
    private connectToProjection();
    private applyCommit(commit);
    private sleep(ms);
}
