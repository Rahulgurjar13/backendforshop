"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Constants = void 0;
class Constants {
}
exports.Constants = Constants;
Constants.CLIENT_EXCEPTION = (client) => {
    return `Cannot re-initialize ${client}. Please utilize the existing client object with required credentials`;
};
