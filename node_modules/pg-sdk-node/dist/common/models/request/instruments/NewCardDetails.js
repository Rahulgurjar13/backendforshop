"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewCardDetails = void 0;
class NewCardDetails {
    constructor(encryptedCardNumber, encryptedCvv, encryptionKeyId, expiry, cardHolderName) {
        this.encryptedCardNumber = encryptedCardNumber;
        this.encryptedCvv = encryptedCvv;
        this.encryptionKeyId = encryptionKeyId;
        this.expiry = expiry;
        this.cardHolderName = cardHolderName;
    }
}
exports.NewCardDetails = NewCardDetails;
NewCardDetails.builder = () => {
    return new NewCardDetailsBuilder();
};
class NewCardDetailsBuilder {
    constructor() {
        /**
         * SETTERS
         */
        this.encryptedCardNumber = (encryptedCardNumber) => {
            this._encryptedCardNumber = encryptedCardNumber;
            return this;
        };
        this.encryptedCvv = (encryptedCvv) => {
            this._encryptedCvv = encryptedCvv;
            return this;
        };
        this.encryptionKeyId = (encryptionKeyId) => {
            this._encryptionKeyId = encryptionKeyId;
            return this;
        };
        this.expiry = (expiry) => {
            this._expiry = expiry;
            return this;
        };
        this.cardHolderName = (cardHolderName) => {
            this._cardHolderName = cardHolderName;
            return this;
        };
        this.build = () => {
            return new NewCardDetails(this._encryptedCardNumber, this._encryptedCvv, this._encryptionKeyId, this._expiry, this._cardHolderName);
        };
    }
}
