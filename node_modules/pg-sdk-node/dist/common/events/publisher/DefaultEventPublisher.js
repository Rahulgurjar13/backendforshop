"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultEventPublisher = void 0;
const EventPublisher_1 = require("./EventPublisher");
class DefaultEventPublisher extends EventPublisher_1.EventPublisher {
    setAuthTokenSupplier(authTokenSupplier) {
        // will be used when shouldPublishEvents = false
    }
    startPublishingEvents(authTokenSupplier) {
        // will be used when shouldPublishEvents = false
    }
    send(event) {
        // will be used when shouldPublishEvents = false
    }
}
exports.DefaultEventPublisher = DefaultEventPublisher;
