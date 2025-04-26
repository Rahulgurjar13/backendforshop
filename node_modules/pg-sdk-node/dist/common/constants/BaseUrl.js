"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseUrl = void 0;
exports.BaseUrl = {
    PRODUCTION: {
        PG_HOST_URL: 'https://api.phonepe.com/apis/pg',
        OAUTH_HOST_URL: 'https://api.phonepe.com/apis/identity-manager',
        EVENTS_HOST_URL: 'https://api.phonepe.com/apis/pg-ingestion',
    },
    SANDBOX: {
        PG_HOST_URL: 'https://api-preprod.phonepe.com/apis/pg-sandbox',
        OAUTH_HOST_URL: 'https://api-preprod.phonepe.com/apis/pg-sandbox',
        EVENTS_HOST_URL: 'http://localhost',
    },
};
