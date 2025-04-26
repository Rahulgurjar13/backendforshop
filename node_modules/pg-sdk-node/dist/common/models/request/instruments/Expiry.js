"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Expiry = void 0;
class Expiry {
    constructor(month, year) {
        this.month = month;
        this.year = year;
    }
}
exports.Expiry = Expiry;
Expiry.builder = () => {
    return new ExpiryBuilder();
};
class ExpiryBuilder {
    constructor() {
        this.expiryMonth = (expiryMonth) => {
            this._expiryMonth = expiryMonth;
            return this;
        };
        this.expiryYear = (expiryYear) => {
            this._expiryYear = expiryYear;
            return this;
        };
        this.build = () => {
            return new Expiry(this._expiryMonth, this._expiryYear);
        };
    }
}
