"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenPaymentV2Instrument = void 0;
const PgV2InstrumentType_1 = require("../../PgV2InstrumentType");
const PaymentV2Instrument_1 = require("./PaymentV2Instrument");
class TokenPaymentV2Instrument extends PaymentV2Instrument_1.PaymentV2Instrument {
    constructor(tokenDetails, authMode, merchantUserId) {
        super(PgV2InstrumentType_1.PgV2InstrumentType.TOKEN);
        this.authMode = authMode;
        this.tokenDetails = tokenDetails;
        this.merchantUserId = merchantUserId;
    }
}
exports.TokenPaymentV2Instrument = TokenPaymentV2Instrument;
TokenPaymentV2Instrument.builder = () => {
    return new TokenPaymentV2InstrumentBuilder();
};
class TokenPaymentV2InstrumentBuilder {
    constructor() {
        this.tokenDetails = (tokenDetails) => {
            this._tokenDetails = tokenDetails;
            return this;
        };
        this.authMode = (authMode) => {
            this._authMode = authMode;
            return this;
        };
        this.merchantUserId = (merchantUserId) => {
            this._merchantUserId = merchantUserId;
            return this;
        };
        this.build = () => {
            return new TokenPaymentV2Instrument(this._tokenDetails, this._authMode, this._merchantUserId);
        };
    }
}
