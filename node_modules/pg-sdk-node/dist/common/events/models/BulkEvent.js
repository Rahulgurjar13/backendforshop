"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BulkEvent = void 0;
const Headers_1 = require("../../constants/Headers");
const Constants_1 = require("../Constants");
class BulkEvent {
    constructor(events, source, clientVersion) {
        this.source = Constants_1.Constants.SOURCE;
        this.clientVersion = Headers_1.Headers.SDK_TYPE + ':' + Headers_1.Headers.SDK_VERSION;
        this.events = events;
        this.source = source;
        this.clientVersion = clientVersion;
    }
}
exports.BulkEvent = BulkEvent;
BulkEvent.builder = () => {
    return new BulkEventBuilder();
};
class BulkEventBuilder {
    constructor() {
        this.events = (eventList) => {
            this._events = eventList;
            return this;
        };
        this.source = (source) => {
            this._source = source;
            return this;
        };
        this.clientVersion = (clientVersion) => {
            this._clientVersion = clientVersion;
            return this;
        };
        this.build = () => {
            var _a, _b;
            this._source = (_a = this._source) !== null && _a !== void 0 ? _a : Constants_1.Constants.SOURCE;
            this._clientVersion =
                (_b = this._clientVersion) !== null && _b !== void 0 ? _b : Headers_1.Headers.SDK_TYPE + ':' + Headers_1.Headers.SDK_VERSION;
            return new BulkEvent(this._events, this._source, this._clientVersion);
        };
    }
}
