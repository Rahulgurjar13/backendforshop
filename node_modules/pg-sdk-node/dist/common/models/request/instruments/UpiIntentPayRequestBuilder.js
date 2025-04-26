"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpiIntentPayRequestBuilder = void 0;
const CustomCheckoutPayRequest_1 = require("../../../../payments/v2/models/request/CustomCheckoutPayRequest");
const DeviceContext_1 = require("../DeviceContext");
const IntentPaymentV2Instrument_1 = require("./IntentPaymentV2Instrument");
const PgPaymentFlow_1 = require("../../../../payments/v2/models/request/PgPaymentFlow");
class UpiIntentPayRequestBuilder {
    constructor() {
        /**
         * SETTERS
         */
        this.merchantOrderId = (merchantOrderId) => {
            this._merchantOrderId = merchantOrderId;
            return this;
        };
        this.amount = (amount) => {
            this._amount = amount;
            return this;
        };
        this.metaInfo = (metaInfo) => {
            this._metaInfo = metaInfo;
            return this;
        };
        this.constraints = (constraints) => {
            this._constraints = constraints;
        };
        this.deviceOS = (deviceOS) => {
            this._deviceOS = deviceOS;
            return this;
        };
        this.merchantCallBackScheme = (merchantCallBackScheme) => {
            this._merchantCallBackScheme = merchantCallBackScheme;
            return this;
        };
        this.targetApp = (targetApp) => {
            this._targetApp = targetApp;
            return this;
        };
        this.expireAfter = (expireAfter) => {
            this._expireAfter = expireAfter;
            return this;
        };
        this.build = () => {
            const paymentFlow = PgPaymentFlow_1.PgPaymentFlow.builder()
                .paymentMode(IntentPaymentV2Instrument_1.IntentPaymentV2Instrument.builder().targetApp(this._targetApp).build())
                .build();
            const deviceContext = DeviceContext_1.DeviceContext.builder()
                .deviceOS(this._deviceOS)
                .merchantCallBackScheme(this._merchantCallBackScheme)
                .build();
            return new CustomCheckoutPayRequest_1.CustomCheckoutPayRequest(this._merchantOrderId, this._amount, paymentFlow, this._expireAfter, this._metaInfo, this._constraints, deviceContext);
        };
    }
}
exports.UpiIntentPayRequestBuilder = UpiIntentPayRequestBuilder;
