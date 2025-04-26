"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventPublisherFactory = void 0;
const QueuedEventPublisher_1 = require("./QueuedEventPublisher");
const DefaultEventPublisher_1 = require("./DefaultEventPublisher");
const Constants_1 = require("../Constants");
const EventQueueHandler_1 = require("../EventQueueHandler");
class EventPublisherFactory {
    constructor(httpClient, hostUrl) {
        this.httpClient = httpClient;
        this.hostUrl = hostUrl;
    }
    getEventPublisher(shouldPublishEvents) {
        if (shouldPublishEvents) {
            if (EventPublisherFactory.cachedEventPublisher == undefined) {
                EventPublisherFactory.cachedEventPublisher = new QueuedEventPublisher_1.QueuedEventPublisher(this.httpClient, this.hostUrl, new EventQueueHandler_1.EventQueueHandler(Constants_1.Constants.QUEUE_MAX_SIZE));
            }
            return EventPublisherFactory.cachedEventPublisher;
        }
        return new DefaultEventPublisher_1.DefaultEventPublisher();
    }
}
exports.EventPublisherFactory = EventPublisherFactory;
