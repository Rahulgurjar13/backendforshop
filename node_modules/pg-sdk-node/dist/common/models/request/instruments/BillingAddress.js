"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingAddress = void 0;
class BillingAddress {
    constructor(line1, line2, city, state, zip, country) {
        this.line1 = line1;
        this.line2 = line2;
        this.city = city;
        this.state = state;
        this.zip = zip;
        this.country = country;
    }
    static builder() {
        return new BillingAddressBuilder();
    }
}
exports.BillingAddress = BillingAddress;
class BillingAddressBuilder {
    constructor() {
        /**
         * SETTERS
         */
        this.line1 = (line1) => {
            this._line1 = line1;
        };
        this.line2 = (line2) => {
            this._line2 = line2;
        };
        this.city = (city) => {
            this._city = city;
        };
        this.state = (state) => {
            this._state = state;
        };
        this.zip = (zip) => {
            this._zip = zip;
        };
        this.country = (country) => {
            this._country = country;
        };
        this.build = () => {
            return new BillingAddress(this._line1, this._line2, this._city, this._state, this._zip, this._country);
        };
    }
}
