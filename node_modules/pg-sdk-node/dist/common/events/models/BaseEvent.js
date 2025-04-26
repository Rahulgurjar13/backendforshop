"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseEvent = void 0;
const BaseEventBuilder_1 = require("../builders/BaseEventBuilder");
class BaseEvent {
    constructor(merchantOrderId, eventName, eventTime, data) {
        this.merchantOrderId = merchantOrderId;
        this.eventName = eventName;
        this.eventTime = eventTime;
        this.data = data;
    }
    static builder() {
        return new BaseEventBuilder_1.BaseEventBuilder();
    }
}
exports.BaseEvent = BaseEvent;
