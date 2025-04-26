"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateSdkOrderRequest = void 0;
const PgCheckoutPaymentFlow_1 = require("./PgCheckoutPaymentFlow");
/**
 * Creates a request to initiate a order for SDK Integration
 * 1. For Standard Checkout -> CreateSdkOrderRequest.StandardCheckoutBuilder()
 * 2. For Custom Checkout -> CreateSdkOrderRequest.CustomCheckoutBuilder()
 */
class CreateSdkOrderRequest {
    constructor(merchantOrderId, amount, paymentFlow, metaInfo, expireAfter, constraints) {
        this.merchantOrderId = merchantOrderId;
        this.amount = amount;
        this.metaInfo = metaInfo;
        this.paymentFlow = paymentFlow;
        this.constraints = constraints;
        this.expireAfter = expireAfter;
    }
}
exports.CreateSdkOrderRequest = CreateSdkOrderRequest;
CreateSdkOrderRequest.StandardCheckoutBuilder = () => {
    return new StandardCheckoutBuilder();
};
CreateSdkOrderRequest.CustomCheckoutBuilder = () => {
    return new CustomCheckoutBuilder();
};
class CustomCheckoutBuilder {
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
        this.message = (message) => {
            this._message = message;
            return this;
        };
        this.redirectUrl = (redirectUrl) => {
            this._redirectUrl = redirectUrl;
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
            const paymentFlow = PgCheckoutPaymentFlow_1.PgCheckoutPaymentFlow.builder()
                .redirectUrl(this._redirectUrl)
                .message(this._message)
                .build();
            return new CreateSdkOrderRequest(this._merchantOrderId, this._amount, paymentFlow, this._metaInfo, this._expireAfter, this._constraints);
        };
    }
}
class StandardCheckoutBuilder {
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
        this.message = (message) => {
            this._message = message;
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
            const paymentFlow = PgCheckoutPaymentFlow_1.PgCheckoutPaymentFlow.builder()
                .redirectUrl(this._redirectUrl)
                .message(this._message)
                .build();
            return new CreateSdkOrderRequest(this._merchantOrderId, this._amount, paymentFlow, this._metaInfo, this._expireAfter);
        };
    }
}
