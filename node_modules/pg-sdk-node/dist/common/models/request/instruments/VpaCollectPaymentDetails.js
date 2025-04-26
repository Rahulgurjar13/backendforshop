"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VpaCollectPaymentDetails = void 0;
const CollectPaymentDetails_1 = require("./CollectPaymentDetails");
const CollectPaymentDetailsType_1 = require("./CollectPaymentDetailsType");
class VpaCollectPaymentDetails extends CollectPaymentDetails_1.CollectPaymentDetails {
    constructor(vpa) {
        super(CollectPaymentDetailsType_1.CollectPaymentDetailsType.VPA);
        this.vpa = vpa;
    }
}
exports.VpaCollectPaymentDetails = VpaCollectPaymentDetails;
VpaCollectPaymentDetails.builder = () => {
    return new VpaCollectPaymentDetailsBuilder();
};
class VpaCollectPaymentDetailsBuilder {
    constructor() {
        this.vpa = (vpa) => {
            this._vpa = vpa;
            return this;
        };
        this.build = () => {
            return new VpaCollectPaymentDetails(this._vpa);
        };
    }
}
