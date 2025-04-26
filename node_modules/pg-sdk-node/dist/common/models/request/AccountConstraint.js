"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountConstraint = void 0;
const InstrumentConstraint_1 = require("./InstrumentConstraint");
const PaymentInstrumentType_1 = require("./PaymentInstrumentType");
/**
 * Used to create an Account Constraint which can be send with the pay request
 */
class AccountConstraint extends InstrumentConstraint_1.InstrumentConstraint {
    constructor(accountNumber, ifsc) {
        super(PaymentInstrumentType_1.PaymentInstrumentType.ACCOUNT);
        this.accountNumber = accountNumber;
        this.ifsc = ifsc;
    }
}
exports.AccountConstraint = AccountConstraint;
AccountConstraint.builder = () => {
    return new AccountConstraintBuilder();
};
class AccountConstraintBuilder {
    constructor() {
        this.accountNumber = (accountNumber) => {
            this._accountNumber = accountNumber;
            return this;
        };
        this.ifsc = (ifsc) => {
            this._ifsc = ifsc;
            return this;
        };
        this.build = () => {
            return new AccountConstraint(this._accountNumber, this._ifsc);
        };
    }
}
