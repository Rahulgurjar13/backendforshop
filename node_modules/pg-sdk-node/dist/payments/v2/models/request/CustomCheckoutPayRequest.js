"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomCheckoutPayRequest = void 0;
const UpiIntentPayRequestBuilder_1 = require("../../../../common/models/request/instruments/UpiIntentPayRequestBuilder");
const UpiCollectPayViaVpaRequestBuilder_1 = require("../../../../common/models/request/instruments/UpiCollectPayViaVpaRequestBuilder");
const UpiQrRequestBuilder_1 = require("../../../../common/models/request/instruments/UpiQrRequestBuilder");
const NetBankingPayRequestBuilder_1 = require("../../../../common/models/request/instruments/NetBankingPayRequestBuilder");
const TokenPayRequestBuilder_1 = require("../../../../common/models/request/instruments/TokenPayRequestBuilder");
const CardPayRequestBuilder_1 = require("../../../../common/models/request/instruments/CardPayRequestBuilder");
/**
 * Creates a request based on different builder for different instruments.
 * 1. UpiIntentPayRequestBuilder -> Upi Intent
 * 2. UpiCollectPayViaVpaRequestBuilder -> Upi Collect
 * 3. UpiQrRequestBuilder -> Upi QR
 * 4. NetBankingPayRequestBuilder -> Netbanking
 * 5. TokenPayRequestBuilder -> Token
 * 6. CardPayRequestBuilder -> Card
 */
class CustomCheckoutPayRequest {
    constructor(merchantOrderId, amount, paymentFlow, expireAfter, metaInfo, constrainsts, deviceContext) {
        this.merchantOrderId = merchantOrderId;
        this.amount = amount;
        this.paymentFlow = paymentFlow;
        this.metaInfo = metaInfo;
        this.constraints = constrainsts;
        this.deviceContext = deviceContext;
        this.expireAfter = expireAfter;
    }
    static UpiIntentPayRequestBuilder() {
        return new UpiIntentPayRequestBuilder_1.UpiIntentPayRequestBuilder();
    }
    static UpiCollectPayViaVpaRequestBuilder() {
        return new UpiCollectPayViaVpaRequestBuilder_1.UpiCollectPayViaVpaRequestBuilder();
    }
    static UpiQrRequestBuilder() {
        return new UpiQrRequestBuilder_1.UpiQrRequestBuilder();
    }
    static NetBankingPayRequestBuilder() {
        return new NetBankingPayRequestBuilder_1.NetBankingPayRequestBuilder();
    }
    static TokenPayRequestBuilder() {
        return new TokenPayRequestBuilder_1.TokenPayRequestBuilder();
    }
    static CardPayRequestBuilder() {
        return new CardPayRequestBuilder_1.CardPayRequestBuilder();
    }
}
exports.CustomCheckoutPayRequest = CustomCheckoutPayRequest;
