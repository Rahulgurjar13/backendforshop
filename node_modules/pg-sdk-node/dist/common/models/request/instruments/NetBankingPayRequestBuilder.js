"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetBankingPayRequestBuilder = void 0;
const CustomCheckoutPayRequest_1 = require("../../../../payments/v2/models/request/CustomCheckoutPayRequest");
const NetBankingPaymentV2Instrument_1 = require("./NetBankingPaymentV2Instrument");
const PgPaymentFlow_1 = require("../../../../payments/v2/models/request/PgPaymentFlow");
class NetBankingPayRequestBuilder {
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
        this.bankId = (bankId) => {
            this._bankId = bankId;
            return this;
        };
        this.merchantUserId = (merchantUserId) => {
            this._merchantUserId = merchantUserId;
            return this;
        };
        this.redirectUrl = (redirectUrl) => {
            this._redirectUrl = redirectUrl;
            return this;
        };
        this.expireAfter = (expireAfter) => {
            this._expireAfter = expireAfter;
            return this;
        };
        this.build = () => {
            const paymentFlow = PgPaymentFlow_1.PgPaymentFlow.builder()
                .paymentMode(NetBankingPaymentV2Instrument_1.NetBankingPaymentV2Instrument.builder()
                .bankId(this._bankId)
                .merchantUserId(this._merchantUserId)
                .build())
                .redirectUrl(this._redirectUrl)
                .build();
            return new CustomCheckoutPayRequest_1.CustomCheckoutPayRequest(this._merchantOrderId, this._amount, paymentFlow, this._expireAfter, this._metaInfo, this._constraints);
        };
    }
}
exports.NetBankingPayRequestBuilder = NetBankingPayRequestBuilder;
