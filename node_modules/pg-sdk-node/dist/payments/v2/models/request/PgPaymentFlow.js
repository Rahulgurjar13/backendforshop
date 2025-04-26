"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PgPaymentFlow = void 0;
const MerchantUrls_1 = require("./MerchantUrls");
const PaymentFlow_1 = require("../../../../common/models/PaymentFlow");
const PaymentFlowType_1 = require("../../../../common/models/PaymentFlowType");
class PgPaymentFlow extends PaymentFlow_1.PaymentFlow {
    constructor(paymentMode, redirectUrl) {
        super(PaymentFlowType_1.PaymentFlowType.PG);
        this.paymentMode = paymentMode;
        this.merchantUrls = new MerchantUrls_1.MerchantUrls(redirectUrl);
    }
}
exports.PgPaymentFlow = PgPaymentFlow;
PgPaymentFlow.builder = () => {
    return new PgPaymentFlowBuilder();
};
class PgPaymentFlowBuilder {
    constructor() {
        /**
         * SETTERS FOR PG PAYMENT FLOW
         */
        this.paymentMode = (paymentMode) => {
            this._paymentMode = paymentMode;
            return this;
        };
        this.redirectUrl = (redirectUrl) => {
            this._redirectUrl = redirectUrl;
            return this;
        };
        this.build = () => {
            return new PgPaymentFlow(this._paymentMode, this._redirectUrl);
        };
    }
}
