"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StandardCheckoutPayRequest = void 0;
const PgCheckoutPaymentFlow_1 = require("./PgCheckoutPaymentFlow");
/**
 * Creates a request using the builder -> StandardCheckoutPayRequest.builder()
 */
class StandardCheckoutPayRequest {
    constructor(merchantOrderId, amount, metaInfo, message, redirectUrl, expireAfter) {
        this.merchantOrderId = merchantOrderId;
        this.amount = amount;
        this.metaInfo = metaInfo;
        this.expireAfter = expireAfter;
        this.paymentFlow = PgCheckoutPaymentFlow_1.PgCheckoutPaymentFlow.builder()
            .message(message)
            .redirectUrl(redirectUrl)
            .build();
    }
    static builder() {
        return new StandardCheckoutPayRequestBuilder();
    }
}
exports.StandardCheckoutPayRequest = StandardCheckoutPayRequest;
class StandardCheckoutPayRequestBuilder {
    constructor() {
        /**
         * Setters used for  builder
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
        this.redirectUrl = (redirectUrl) => {
            this._redirectUrl = redirectUrl;
            return this;
        };
        this.message = (message) => {
            this._message = message;
            return this;
        };
        this.expireAfter = (expireAfter) => {
            this._expireAfter = expireAfter;
            return this;
        };
        this.build = () => {
            return new StandardCheckoutPayRequest(this._merchantOrderId, this._amount, this._metaInfo, this._message, this._redirectUrl, this._expireAfter);
        };
    }
}
