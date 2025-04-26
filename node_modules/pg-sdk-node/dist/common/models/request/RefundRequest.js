"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefundRequest = void 0;
/**
 * Creates a request to initiate a refund -> RefundRequest.builder()
 */
class RefundRequest {
    constructor(merchantRefundId, originalMerchantOrderId, amount) {
        this.merchantRefundId = merchantRefundId;
        this.originalMerchantOrderId = originalMerchantOrderId;
        this.amount = amount;
    }
}
exports.RefundRequest = RefundRequest;
RefundRequest.builder = () => {
    return new RefundRequestBuilder();
};
class RefundRequestBuilder {
    constructor() {
        this.merchantRefundId = (merchantRefundId) => {
            this._merchantRefundId = merchantRefundId;
            return this;
        };
        this.originalMerchantOrderId = (originalMerchantOrderId) => {
            this._originalMerchantOrderId = originalMerchantOrderId;
            return this;
        };
        this.amount = (amount) => {
            this._amount = amount;
            return this;
        };
        this.build = () => {
            return new RefundRequest(this._merchantRefundId, this._originalMerchantOrderId, this._amount);
        };
    }
}
