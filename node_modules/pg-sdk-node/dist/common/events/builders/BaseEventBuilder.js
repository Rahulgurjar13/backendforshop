"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseEventBuilder = void 0;
const BaseEvent_1 = require("../models/BaseEvent");
class BaseEventBuilder {
    constructor() {
        /**
         * SETTERS
         **/
        this.setMerchantOrderId = (merchantOrderId) => {
            this._merchantOrderId = merchantOrderId;
            return this;
        };
        this.setEventName = (eventName) => {
            this._eventName = eventName;
            return this;
        };
        this.setEventTime = (eventTime) => {
            this._eventTime = eventTime;
            return this;
        };
        this.setData = (data) => {
            this._data = data;
            return this;
        };
        this.build = () => {
            return new BaseEvent_1.BaseEvent(this._merchantOrderId, this._eventName, this._eventTime, this._data);
        };
    }
}
exports.BaseEventBuilder = BaseEventBuilder;
