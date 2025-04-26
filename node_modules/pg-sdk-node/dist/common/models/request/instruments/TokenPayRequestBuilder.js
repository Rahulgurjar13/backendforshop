"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenPayRequestBuilder = void 0;
const CustomCheckoutPayRequest_1 = require("../../../../payments/v2/models/request/CustomCheckoutPayRequest");
const Expiry_1 = require("./Expiry");
const TokenDetails_1 = require("./TokenDetails");
const TokenPaymentV2Instrument_1 = require("./TokenPaymentV2Instrument");
const PgPaymentFlow_1 = require("../../../../payments/v2/models/request/PgPaymentFlow");
class TokenPayRequestBuilder {
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
        this.encryptedToken = (encryptedToken) => {
            this._encryptedToken = encryptedToken;
            return this;
        };
        this.authMode = (authMode) => {
            this._authMode = authMode;
            return this;
        };
        this.encryptionKeyId = (encryptionKeyId) => {
            this._encryptionKeyId = encryptionKeyId;
            return this;
        };
        this.panSuffix = (panSuffix) => {
            this._panSuffix = panSuffix;
            return this;
        };
        this.cryptogram = (cryptogram) => {
            this._cryptogram = cryptogram;
            return this;
        };
        this.encryptedCvv = (encryptedCvv) => {
            this._encryptedCvv = encryptedCvv;
            return this;
        };
        this.expiryMonth = (expiryMonth) => {
            this._expiryMonth = expiryMonth;
            return this;
        };
        this.expiryYear = (expiryYear) => {
            this._expiryYear = expiryYear;
            return this;
        };
        this.redirectUrl = (redirectUrl) => {
            this._redirectUrl = redirectUrl;
            return this;
        };
        this.cardHolderName = (cardHolderName) => {
            this._cardHolderName = cardHolderName;
            return this;
        };
        this.merchantUserId = (merchantUserId) => {
            this._merchantUserId = merchantUserId;
            return this;
        };
        this.expireAfter = (expireAfter) => {
            this._expireAfter = expireAfter;
            return this;
        };
        this.build = () => {
            const tokenDetails = TokenDetails_1.TokenDetails.builder()
                .cardHolderName(this._cardHolderName)
                .cryptogram(this._cryptogram)
                .panSuffix(this._panSuffix)
                .expiry(Expiry_1.Expiry.builder()
                .expiryMonth(this._expiryMonth)
                .expiryYear(this._expiryYear)
                .build())
                .encryptionKeyId(this._encryptionKeyId)
                .encryptedToken(this._encryptedToken)
                .encryptedCvv(this._encryptedCvv)
                .build();
            const paymentFlow = PgPaymentFlow_1.PgPaymentFlow.builder()
                .paymentMode(TokenPaymentV2Instrument_1.TokenPaymentV2Instrument.builder()
                .tokenDetails(tokenDetails)
                .authMode(this._authMode)
                .merchantUserId(this._merchantUserId)
                .build())
                .redirectUrl(this._redirectUrl)
                .build();
            return new CustomCheckoutPayRequest_1.CustomCheckoutPayRequest(this._merchantOrderId, this._amount, paymentFlow, this._expireAfter, this._metaInfo, this._constraints);
        };
    }
}
exports.TokenPayRequestBuilder = TokenPayRequestBuilder;
