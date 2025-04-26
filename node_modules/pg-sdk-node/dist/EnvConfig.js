"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvConfig = void 0;
const BaseUrl_1 = require("./common/constants/BaseUrl");
const Env_1 = require("./Env");
class EnvConfig {
    constructor(pgHostUrl, oAuthHostUrl, eventsHostUrl) {
        this._pgHostUrl = pgHostUrl;
        this._oAuthHostUrl = oAuthHostUrl;
        this._eventsHostUrl = eventsHostUrl;
    }
    static getBaseUrls(envType) {
        if (Object.prototype.hasOwnProperty.call(BaseUrl_1.BaseUrl, envType))
            return new EnvConfig(BaseUrl_1.BaseUrl[envType].PG_HOST_URL, BaseUrl_1.BaseUrl[envType].OAUTH_HOST_URL, BaseUrl_1.BaseUrl[envType].EVENTS_HOST_URL);
        return new EnvConfig(BaseUrl_1.BaseUrl[Env_1.Env.SANDBOX].PG_HOST_URL, BaseUrl_1.BaseUrl[Env_1.Env.SANDBOX].OAUTH_HOST_URL, BaseUrl_1.BaseUrl[Env_1.Env.SANDBOX].EVENTS_HOST_URL);
    }
    get pgHostUrl() {
        return this._pgHostUrl;
    }
    get oAuthHostUrl() {
        return this._oAuthHostUrl;
    }
    get eventsHostUrl() {
        return this._eventsHostUrl;
    }
}
exports.EnvConfig = EnvConfig;
