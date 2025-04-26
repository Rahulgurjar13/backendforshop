"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseClient = void 0;
const axios_1 = __importDefault(require("axios"));
const CredentialConfig_1 = require("./configs/CredentialConfig");
const TokenService_1 = require("./tokenhandler/TokenService");
const HttpCommand_1 = require("./http/HttpCommand");
const Headers_1 = require("./constants/Headers");
const class_transformer_1 = require("class-transformer");
const axios_retry_1 = __importDefault(require("axios-retry"));
const Exceptions_1 = require("./exception/Exceptions");
const EnvConfig_1 = require("../EnvConfig");
const EventPublisherFactory_1 = require("./events/publisher/EventPublisherFactory");
class BaseClient {
    constructor(clientId, clientSecret, clientVersion, env, shouldPublishEvents) {
        this.requestViaAuthRefresh = (method, url, responseType, headers, data, pathParams) => __awaiter(this, void 0, void 0, function* () {
            const httpHeaders = yield this.addAuthHeader(headers);
            try {
                const response = yield this._httpCommand.request(url, method, httpHeaders, data, pathParams);
                const deserializedResponse = (0, class_transformer_1.plainToClass)(responseType, response);
                return deserializedResponse;
            }
            catch (error) {
                if (error instanceof Exceptions_1.UnauthorizedAccess) {
                    yield this.tokenService.forceRefreshToken();
                }
                throw error;
            }
        });
        this.addAuthHeader = (headers) => __awaiter(this, void 0, void 0, function* () {
            const httpHeaders = Object.assign({}, headers);
            httpHeaders[Headers_1.Headers.OAUTH_AUTHORIZATION] =
                yield this._tokenService.getOAuthToken();
            return httpHeaders;
        });
        this._httpClient = axios_1.default.create();
        this._env = env;
        this._merchantConfig = CredentialConfig_1.CredentialConfig.builder()
            .clientId(clientId)
            .clientSecret(clientSecret)
            .clientVersion(clientVersion)
            .build();
        (0, axios_retry_1.default)(this._httpClient, {
            retries: 0, // No retries
        });
        this._httpCommand = new HttpCommand_1.HttpCommand(EnvConfig_1.EnvConfig.getBaseUrls(env).pgHostUrl, this._httpClient);
        this._shouldPublishEvents = shouldPublishEvents;
        this._eventPublisherFactory = new EventPublisherFactory_1.EventPublisherFactory(this.httpClient, EnvConfig_1.EnvConfig.getBaseUrls(env).eventsHostUrl);
        this._eventPublisher =
            this._eventPublisherFactory.getEventPublisher(shouldPublishEvents);
        this._tokenService = new TokenService_1.TokenService(this._httpClient, this._merchantConfig, env, this._eventPublisher);
        this._eventPublisher.startPublishingEvents(this.tokenService.getOAuthToken);
    }
    /**
     * Getters for BaseClient fields
     */
    get env() {
        return this._env;
    }
    get httpClient() {
        return this._httpClient;
    }
    get tokenService() {
        return this._tokenService;
    }
    get merchantConfig() {
        return this._merchantConfig;
    }
    get shouldPublishEvents() {
        return this._shouldPublishEvents;
    }
    get eventPublisher() {
        return this._eventPublisher;
    }
}
exports.BaseClient = BaseClient;
