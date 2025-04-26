"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpiCollectPayViaVpaRequestBuilder = void 0;
const CustomCheckoutPayRequest_1 = require("../../../../payments/v2/models/request/CustomCheckoutPayRequest");
const CollectPaymentV2Instrument_1 = require("./CollectPaymentV2Instrument");
const VpaCollectPaymentDetails_1 = require("./VpaCollectPaymentDetails");
const PgPaymentFlow_1 = require("../../../../payments/v2/models/request/PgPaymentFlow");
class UpiCollectPayViaVpaRequestBuilder {
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
        this.message = (message) => {
            this._message = message;
            return this;
        };
        this.vpa = (vpa) => {
            this._vpa = vpa;
            return this;
        };
        this.expireAfter = (expireAfter) => {
            this._expireAfter = expireAfter;
            return this;
        };
        this.build = () => {
            const paymentFlow = PgPaymentFlow_1.PgPaymentFlow.builder()
                .paymentMode(CollectPaymentV2Instrument_1.CollectPaymentV2Instrument.builder()
                .details(VpaCollectPaymentDetails_1.VpaCollectPaymentDetails.builder().vpa(this._vpa).build())
                .message(this._message)
                .build())
                .build();
            return new CustomCheckoutPayRequest_1.CustomCheckoutPayRequest(this._merchantOrderId, this._amount, paymentFlow, this._expireAfter, this._metaInfo, this._constraints);
        };
    }
}
exports.UpiCollectPayViaVpaRequestBuilder = UpiCollectPayViaVpaRequestBuilder;
