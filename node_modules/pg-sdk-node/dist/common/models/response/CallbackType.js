"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CallbackType = void 0;
var CallbackType;
(function (CallbackType) {
    CallbackType[CallbackType["PG_ORDER_COMPLETED"] = 0] = "PG_ORDER_COMPLETED";
    CallbackType[CallbackType["PG_ORDER_FAILED"] = 1] = "PG_ORDER_FAILED";
    CallbackType[CallbackType["PG_TRANSACTION_ATTEMPT_FAILED"] = 2] = "PG_TRANSACTION_ATTEMPT_FAILED";
    CallbackType[CallbackType["PG_REFUND_COMPLETED"] = 3] = "PG_REFUND_COMPLETED";
    CallbackType[CallbackType["PG_REFUND_FAILED"] = 4] = "PG_REFUND_FAILED";
    CallbackType[CallbackType["PG_REFUND_ACCEPTED"] = 5] = "PG_REFUND_ACCEPTED";
    CallbackType[CallbackType["CHECKOUT_ORDER_COMPLETED"] = 6] = "CHECKOUT_ORDER_COMPLETED";
    CallbackType[CallbackType["CHECKOUT_ORDER_FAILED"] = 7] = "CHECKOUT_ORDER_FAILED";
    CallbackType[CallbackType["CHECKOUT_TRANSACTION_ATTEMPT_FAILED"] = 8] = "CHECKOUT_TRANSACTION_ATTEMPT_FAILED";
})(CallbackType = exports.CallbackType || (exports.CallbackType = {}));
