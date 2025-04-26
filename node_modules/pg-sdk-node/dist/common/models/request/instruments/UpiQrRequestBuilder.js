"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpiQrRequestBuilder = void 0;
const CustomCheckoutPayRequest_1 = require("../../../../payments/v2/models/request/CustomCheckoutPayRequest");
const UpiQrPaymentV2Instrument_1 = require("./UpiQrPaymentV2Instrument");
const PgPaymentFlow_1 = require("../../../../payments/v2/models/request/PgPaymentFlow");
class UpiQrRequestBuilder {
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
            return this;
        };
        this.expireAfter = (expireAfter) => {
            this._expireAfter = expireAfter;
            return this;
        };
        this.build = () => {
            const paymentFlow = PgPaymentFlow_1.PgPaymentFlow.builder()
                .paymentMode(UpiQrPaymentV2Instrument_1.UpiQrPaymentV2Instrument.builder().build())
                .build();
            return new CustomCheckoutPayRequest_1.CustomCheckoutPayRequest(this._merchantOrderId, this._amount, paymentFlow, this._expireAfter, this._metaInfo, this._constraints);
        };
    }
}
exports.UpiQrRequestBuilder = UpiQrRequestBuilder;
