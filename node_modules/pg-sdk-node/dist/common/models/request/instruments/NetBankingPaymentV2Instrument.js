"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetBankingPaymentV2Instrument = void 0;
const PgV2InstrumentType_1 = require("../../PgV2InstrumentType");
const PaymentV2Instrument_1 = require("./PaymentV2Instrument");
class NetBankingPaymentV2Instrument extends PaymentV2Instrument_1.PaymentV2Instrument {
    constructor(bankId, merchantUserId) {
        super(PgV2InstrumentType_1.PgV2InstrumentType.NET_BANKING);
        this.bankId = bankId;
        this.merchantUserId = merchantUserId;
    }
}
exports.NetBankingPaymentV2Instrument = NetBankingPaymentV2Instrument;
NetBankingPaymentV2Instrument.builder = () => {
    return new NetBankingPaymentV2InstrumentBuilder();
};
class NetBankingPaymentV2InstrumentBuilder {
    constructor() {
        this.bankId = (bankId) => {
            this._bankId = bankId;
            return this;
        };
        this.merchantUserId = (merchantUserId) => {
            this._merchantUserId = merchantUserId;
            return this;
        };
        this.build = () => {
            return new NetBankingPaymentV2Instrument(this._bankId, this._merchantUserId);
        };
    }
}
