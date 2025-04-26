"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaInfo = void 0;
class MetaInfo {
    constructor(udf1, udf2, udf3, udf4, udf5) {
        this.udf1 = udf1;
        this.udf2 = udf2;
        this.udf3 = udf3;
        this.udf4 = udf4;
        this.udf5 = udf5;
    }
    static builder() {
        return new MetaInfoBuilder();
    }
}
exports.MetaInfo = MetaInfo;
class MetaInfoBuilder {
    constructor() {
        /**
         * SETTERS
         */
        this.udf1 = (udf1) => {
            this._udf1 = udf1;
            return this;
        };
        this.udf2 = (udf2) => {
            this._udf2 = udf2;
            return this;
        };
        this.udf3 = (udf3) => {
            this._udf3 = udf3;
            return this;
        };
        this.udf4 = (udf4) => {
            this._udf4 = udf4;
            return this;
        };
        this.udf5 = (udf5) => {
            this._udf5 = udf5;
            return this;
        };
        this.build = () => {
            return new MetaInfo(this._udf1, this._udf2, this._udf3, this._udf4, this._udf5);
        };
    }
}
