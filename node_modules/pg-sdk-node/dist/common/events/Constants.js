"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Constants = void 0;
class Constants {
}
exports.Constants = Constants;
Constants.MAX_EVENTS_IN_BATCH = 10;
Constants.SOURCE = 'BACKEND_SDK';
Constants.CLIENT_VERSION = 'V2';
Constants.AUTHORIZATION = 'Authorization';
Constants.EVENTS_ENDPOINT = '/client/v1/backend/events/batch';
Constants.QUEUE_MAX_SIZE = 20000; // Should be greater than MAX_EVENTS_IN_BATCH
Constants.INITIAL_DELAY = 1000; //in ms
Constants.DELAY = 1000; //in ms
