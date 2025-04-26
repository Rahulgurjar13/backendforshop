"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAuthResponse = void 0;
const class_transformer_1 = require("class-transformer");
class OAuthResponse {
}
__decorate([
    (0, class_transformer_1.Expose)({ name: 'access_token' })
], OAuthResponse.prototype, "accessToken", void 0);
__decorate([
    (0, class_transformer_1.Expose)({ name: 'encrypted_access_token' })
], OAuthResponse.prototype, "encryptedAccessToken", void 0);
__decorate([
    (0, class_transformer_1.Expose)({ name: 'refresh_token' })
], OAuthResponse.prototype, "refreshToken", void 0);
__decorate([
    (0, class_transformer_1.Expose)({ name: 'expires_in' })
], OAuthResponse.prototype, "expiresIn", void 0);
__decorate([
    (0, class_transformer_1.Expose)({ name: 'issued_at' })
], OAuthResponse.prototype, "issuedAt", void 0);
__decorate([
    (0, class_transformer_1.Expose)({ name: 'expires_at' })
], OAuthResponse.prototype, "expiresAt", void 0);
__decorate([
    (0, class_transformer_1.Expose)({ name: 'session_expires_at' })
], OAuthResponse.prototype, "sessionExpiresAt", void 0);
__decorate([
    (0, class_transformer_1.Expose)({ name: 'token_type' })
], OAuthResponse.prototype, "tokenType", void 0);
exports.OAuthResponse = OAuthResponse;
