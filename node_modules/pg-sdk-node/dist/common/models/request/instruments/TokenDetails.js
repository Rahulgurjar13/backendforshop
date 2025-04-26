"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenDetails = void 0;
class TokenDetails {
    constructor(encryptedToken, encryptedCvv, encryptionKeyId, expiry, cryptogram, panSuffix, cardHolderName, eci, atc) {
        this.encryptedToken = encryptedToken;
        this.encryptedCvv = encryptedCvv;
        this.encryptionKeyId = encryptionKeyId;
        this.expiry = expiry;
        this.cryptogram = cryptogram;
        this.panSuffix = panSuffix;
        this.cardHolderName = cardHolderName;
        this.eci = eci;
        this.atc = atc;
    }
}
exports.TokenDetails = TokenDetails;
TokenDetails.builder = () => {
    return new TokenDetailsBuilder();
};
class TokenDetailsBuilder {
    constructor() {
        /**
         * SETTERS
         */
        this.encryptedToken = (encryptedToken) => {
            this._encryptedToken = encryptedToken;
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
        this.cryptogram = (cryptogram) => {
            this._cryptogram = cryptogram;
            return this;
        };
        this.panSuffix = (panSuffix) => {
            this._panSuffix = panSuffix;
            return this;
        };
        this.cardHolderName = (cardHolderName) => {
            this._cardHolderName = cardHolderName;
            return this;
        };
        this.eci = (eci) => {
            this._eci = eci;
            return this;
        };
        this.atc = (atc) => {
            this._atc = atc;
            return this;
        };
        this.build = () => {
            return new TokenDetails(this._encryptedToken, this._encryptedCvv, this._encryptionKeyId, this._expiry, this._cryptogram, this._panSuffix, this._cardHolderName, this._eci, this._atc);
        };
    }
}
