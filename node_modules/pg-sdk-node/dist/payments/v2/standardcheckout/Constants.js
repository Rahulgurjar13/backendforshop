"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StandardCheckoutContants = void 0;
class StandardCheckoutContants {
}
exports.StandardCheckoutContants = StandardCheckoutContants;
StandardCheckoutContants.PAY_API = '/checkout/v2/pay';
StandardCheckoutContants.ORDER_STATUS_API = '/checkout/v2/order/{ORDER_ID}/status';
StandardCheckoutContants.REFUND_API = '/payments/v2/refund';
StandardCheckoutContants.REFUND_STATUS_API = '/payments/v2/refund/{REFUND_ID}/status';
StandardCheckoutContants.ORDER_DETAILS = 'details';
StandardCheckoutContants.TRANSACTION_STATUS_API = '/checkout/v2/transaction/{TRANSACTION_ID}/status';
StandardCheckoutContants.CREATE_ORDER_API = '/checkout/v2/sdk/order';
