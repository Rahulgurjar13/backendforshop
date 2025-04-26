"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceContext = void 0;
class DeviceContext {
    constructor(deviceOS, merchantCallBackScheme) {
        this.deviceOS = deviceOS;
        this.merchantCallBackScheme = merchantCallBackScheme;
    }
    static builder() {
        return new DeviceContextBuilder();
    }
}
exports.DeviceContext = DeviceContext;
class DeviceContextBuilder {
    constructor() {
        /**
         * SETTERS
         */
        this.deviceOS = (deviceOS) => {
            this._deviveOS = deviceOS;
            return this;
        };
        this.merchantCallBackScheme = (merchantCallBackScheme) => {
            this._merchantCallBackScheme = merchantCallBackScheme;
            return this;
        };
        this.build = () => {
            return new DeviceContext(this._deviveOS, this._merchantCallBackScheme);
        };
    }
}
