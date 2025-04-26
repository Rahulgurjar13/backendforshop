"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollectPaymentV2Instrument = void 0;
const PgV2InstrumentType_1 = require("../../PgV2InstrumentType");
const PaymentV2Instrument_1 = require("./PaymentV2Instrument");
class CollectPaymentV2Instrument extends PaymentV2Instrument_1.PaymentV2Instrument {
    constructor(details, message) {
        super(PgV2InstrumentType_1.PgV2InstrumentType.UPI_COLLECT);
        this.details = details;
        this.message = message;
    }
}
exports.CollectPaymentV2Instrument = CollectPaymentV2Instrument;
CollectPaymentV2Instrument.builder = () => {
    return new CollectPaymentV2InstrumentBuilder();
};
class CollectPaymentV2InstrumentBuilder {
    constructor() {
        /**
         * SETTERS
         */
        this.details = (details) => {
            this._details = details;
            return this;
        };
        this.message = (message) => {
            this._message = message;
            return this;
        };
        this.build = () => {
            return new CollectPaymentV2Instrument(this._details, this._message);
        };
    }
}
