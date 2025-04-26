"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhoneNumberCollectPaymentDetails = void 0;
const CollectPaymentDetails_1 = require("./CollectPaymentDetails");
const CollectPaymentDetailsType_1 = require("./CollectPaymentDetailsType");
class PhoneNumberCollectPaymentDetails extends CollectPaymentDetails_1.CollectPaymentDetails {
    constructor(phoneNumber) {
        super(CollectPaymentDetailsType_1.CollectPaymentDetailsType.PHONE_NUMBER);
        this.phoneNumber = phoneNumber;
    }
}
exports.PhoneNumberCollectPaymentDetails = PhoneNumberCollectPaymentDetails;
PhoneNumberCollectPaymentDetails.builder = () => {
    return new PhoneNumberCollectPaymentDetailsBuilder();
};
class PhoneNumberCollectPaymentDetailsBuilder {
    constructor() {
        this.phoneNumber = (phoneNumber) => {
            this._phoneNumber = phoneNumber;
            return this;
        };
        this.build = () => {
            return new PhoneNumberCollectPaymentDetails(this._phoneNumber);
        };
    }
}
