"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardPaymentV2Instrument = void 0;
const PgV2InstrumentType_1 = require("../../PgV2InstrumentType");
const PaymentV2Instrument_1 = require("./PaymentV2Instrument");
class CardPaymentV2Instrument extends PaymentV2Instrument_1.PaymentV2Instrument {
    constructor(cardDetails, authMode, merchantUserId, savedCard) {
        super(PgV2InstrumentType_1.PgV2InstrumentType.CARD);
        this.authMode = authMode;
        this.cardDetails = cardDetails;
        this.merchantUserId = merchantUserId;
        this.savedCard = savedCard;
    }
}
exports.CardPaymentV2Instrument = CardPaymentV2Instrument;
CardPaymentV2Instrument.builder = () => {
    return new CardPaymentV2InstrumentBuilder();
};
class CardPaymentV2InstrumentBuilder {
    constructor() {
        this.cardDetails = (cardDetails) => {
            this._cardDetails = cardDetails;
            return this;
        };
        this.authMode = (authMode) => {
            this._authMode = authMode;
            return this;
        };
        this.savedCard = (savedCard) => {
            this._savedCard = savedCard;
            return this;
        };
        this.merchantUserId = (merchantUserId) => {
            this._merchantUserId = merchantUserId;
            return this;
        };
        this.build = () => {
            return new CardPaymentV2Instrument(this._cardDetails, this._authMode, this._merchantUserId, this._savedCard);
        };
    }
}
