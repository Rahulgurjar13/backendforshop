"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomCheckoutConstants = void 0;
class CustomCheckoutConstants {
}
exports.CustomCheckoutConstants = CustomCheckoutConstants;
CustomCheckoutConstants.PAY_API = '/payments/v2/pay';
CustomCheckoutConstants.ORDER_STATUS_API = '/payments/v2/order/{ORDER_ID}/status';
CustomCheckoutConstants.ORDER_DETAILS = 'details';
CustomCheckoutConstants.REFUND_API = '/payments/v2/refund';
CustomCheckoutConstants.REFUND_STATUS_API = '/payments/v2/refund/{REFUND_ID}/status';
CustomCheckoutConstants.TRANSACTION_STATUS_API = '/payments/v2/transaction/{TRANSACTION_ID}/status';
CustomCheckoutConstants.CREATE_ORDER_API = '/payments/v2/sdk/order';
