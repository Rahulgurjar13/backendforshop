"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntentPaymentV2Instrument = void 0;
const PgV2InstrumentType_1 = require("../../PgV2InstrumentType");
const PaymentV2Instrument_1 = require("./PaymentV2Instrument");
class IntentPaymentV2Instrument extends PaymentV2Instrument_1.PaymentV2Instrument {
    constructor(targetApp) {
        super(PgV2InstrumentType_1.PgV2InstrumentType.UPI_INTENT);
        this.targetApp = targetApp;
    }
}
exports.IntentPaymentV2Instrument = IntentPaymentV2Instrument;
IntentPaymentV2Instrument.builder = () => {
    return new IntentPaymentV2InstrumentBuilder();
};
class IntentPaymentV2InstrumentBuilder {
    constructor() {
        this.targetApp = (targetApp) => {
            this._targetApp = targetApp;
            return this;
        };
        this.build = () => {
            return new IntentPaymentV2Instrument(this._targetApp);
        };
    }
}
