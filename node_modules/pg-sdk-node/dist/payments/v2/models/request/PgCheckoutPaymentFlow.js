"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PgCheckoutPaymentFlow = void 0;
const MerchantUrls_1 = require("./MerchantUrls");
const PaymentFlow_1 = require("../../../../common/models/PaymentFlow");
const PaymentFlowType_1 = require("../../../../common/models/PaymentFlowType");
class PgCheckoutPaymentFlow extends PaymentFlow_1.PaymentFlow {
    constructor(message, redirectUrl) {
        super(PaymentFlowType_1.PaymentFlowType.PG_CHECKOUT);
        this.message = message;
        this.merchantUrls = new MerchantUrls_1.MerchantUrls(redirectUrl);
    }
    static builder() {
        return new PgCheckoutPaymentFlowBuilder();
    }
}
exports.PgCheckoutPaymentFlow = PgCheckoutPaymentFlow;
class PgCheckoutPaymentFlowBuilder {
    /**
     * SETTERS FOR PG_CHECKOUT PAYMENT FLOW
     */
    message(message) {
        this._message = message;
        return this;
    }
    redirectUrl(redirectUrl) {
        this._redirectUrl = redirectUrl;
        return this;
    }
    build() {
        return new PgCheckoutPaymentFlow(this._message, this._redirectUrl);
    }
}
