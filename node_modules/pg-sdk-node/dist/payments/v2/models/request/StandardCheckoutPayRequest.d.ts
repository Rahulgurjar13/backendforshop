import { MetaInfo } from '../../../../common/models/MetaInfo';
import { PaymentFlow } from '../../../../common/models/PaymentFlow';
/**
 * Creates a request using the builder -> StandardCheckoutPayRequest.builder()
 */
export declare class StandardCheckoutPayRequest {
    merchantOrderId: string;
    amount: number;
    paymentFlow: PaymentFlow;
    metaInfo?: MetaInfo;
    expireAfter?: number;
    constructor(merchantOrderId: string, amount: number, metaInfo?: MetaInfo, message?: string, redirectUrl?: string, expireAfter?: number);
    static builder(): StandardCheckoutPayRequestBuilder;
}
declare class StandardCheckoutPayRequestBuilder {
    private _merchantOrderId;
    private _amount;
    private _metaInfo?;
    private _redirectUrl?;
    private _message?;
    private _expireAfter?;
    /**
     * Setters used for  builder
     */
    merchantOrderId: (merchantOrderId: string) => StandardCheckoutPayRequestBuilder;
    amount: (amount: number) => StandardCheckoutPayRequestBuilder;
    metaInfo: (metaInfo: MetaInfo) => StandardCheckoutPayRequestBuilder;
    redirectUrl: (redirectUrl: string) => StandardCheckoutPayRequestBuilder;
    message: (message: string) => StandardCheckoutPayRequestBuilder;
    expireAfter: (expireAfter: number) => StandardCheckoutPayRequestBuilder;
    build: () => StandardCheckoutPayRequest;
}
export {};
