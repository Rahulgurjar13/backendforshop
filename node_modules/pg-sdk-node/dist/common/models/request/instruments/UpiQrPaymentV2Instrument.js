"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpiQrPaymentV2Instrument = void 0;
const PgV2InstrumentType_1 = require("../../PgV2InstrumentType");
const PaymentV2Instrument_1 = require("./PaymentV2Instrument");
class UpiQrPaymentV2Instrument extends PaymentV2Instrument_1.PaymentV2Instrument {
    constructor() {
        super(PgV2InstrumentType_1.PgV2InstrumentType.UPI_QR);
    }
}
exports.UpiQrPaymentV2Instrument = UpiQrPaymentV2Instrument;
UpiQrPaymentV2Instrument.builder = () => {
    return new UpiQrPaymentV2InstrumentBuilder();
};
class UpiQrPaymentV2InstrumentBuilder {
    constructor() {
        this.build = () => {
            return new UpiQrPaymentV2Instrument();
        };
    }
}
