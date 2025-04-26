"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventData = void 0;
const Headers_1 = require("../../constants/Headers");
const EventDataBuilder_1 = require("../builders/EventDataBuilder");
class EventData {
    constructor(builder) {
        var _a, _b;
        this.sdkType = Headers_1.Headers.SDK_TYPE;
        this.sdkVersion = Headers_1.Headers.SDK_VERSION;
        this.flowType = builder.flowType;
        this.paymentFlow = builder.paymentFlow;
        this.sdkType = (_a = builder.sdkType) !== null && _a !== void 0 ? _a : this.sdkType;
        this.sdkVersion = (_b = builder.sdkVersion) !== null && _b !== void 0 ? _b : this.sdkVersion;
        this.apiPath = builder.apiPath;
        this.amount = builder.amount;
        this.targetApp = builder.targetApp;
        this.deviceContext = builder.deviceContext;
        this.expireAfter = builder.expireAfter;
        this.merchantRefundId = builder.merchantRefundId;
        this.originalMerchantOrderId = builder.originalMerchantOrderId;
        this.transactionId = builder.transactionId;
        this.eventState = builder.eventState;
        this.paymentInstrument = builder.paymentInstrument;
        this.cachedTokenIssuedAt = builder.cachedTokenIssuedAt;
        this.cachedTokenExpiresAt = builder.cachedTokenExpiresAt;
        this.tokenFetchAttemptTimestamp = builder.tokenFetchAttemptTimestamp;
        this.exceptionClass = builder.exceptionClass;
        this.exceptionMessage = builder.exceptionMessage;
        this.exceptionCode = builder.exceptionCode;
        this.exceptionHttpStatusCode = builder.exceptionHttpStatusCode;
        this.exceptionData = builder.exceptionData;
    }
    static builder() {
        return new EventDataBuilder_1.EventDataBuilder();
    }
}
exports.EventData = EventData;
