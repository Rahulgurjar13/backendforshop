"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredentialConfigBuilder = exports.CredentialConfig = void 0;
class CredentialConfig {
    constructor(clientId, clientSecret, clientVersion) {
        this._clientId = clientId;
        this._clientSecret = clientSecret;
        this._clientVersion = clientVersion;
    }
    static builder() {
        return new CredentialConfigBuilder();
    }
    /**
     * Getter Functions
     */
    get clientId() {
        return this._clientId;
    }
    get clientSecret() {
        return this._clientSecret;
    }
    get clientVersion() {
        return this._clientVersion;
    }
}
exports.CredentialConfig = CredentialConfig;
class CredentialConfigBuilder {
    constructor() {
        /**
         * Setters used for MerchantConfig builder
         */
        this.clientId = (clientId) => {
            this._clientId = clientId;
            return this;
        };
        this.clientSecret = (clientSecret) => {
            this._clientSecret = clientSecret;
            return this;
        };
        this.clientVersion = (clientVersion) => {
            this._clientVersion = clientVersion;
            return this;
        };
        this.build = () => {
            return new CredentialConfig(this._clientId, this._clientSecret, this._clientVersion);
        };
    }
}
exports.CredentialConfigBuilder = CredentialConfigBuilder;
