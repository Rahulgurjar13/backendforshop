"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommonUtils = void 0;
const crypto_1 = require("crypto");
var SHA_ALGORITHM;
(function (SHA_ALGORITHM) {
    SHA_ALGORITHM["SHA256"] = "SHA256";
})(SHA_ALGORITHM || (SHA_ALGORITHM = {}));
class CommonUtils {
    static calculateSha256(args) {
        const data = Object.values(args).join(':');
        return CommonUtils.shaHex(data, SHA_ALGORITHM.SHA256);
    }
    static shaHex(data, algorithm) {
        switch (algorithm) {
            case SHA_ALGORITHM.SHA256: {
                const hash = (0, crypto_1.createHash)('sha256');
                hash.update(data);
                return hash.digest('hex');
            }
            default:
                return data;
        }
    }
    static isCallbackValid(username, password, authorization) {
        const sha256 = this.calculateSha256({ username, password });
        return sha256 == authorization;
    }
}
exports.CommonUtils = CommonUtils;
