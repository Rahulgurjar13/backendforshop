import { InstrumentConstraint } from '../../../../common/models/request/InstrumentConstraint';
import { MetaInfo } from '../../../../common/models/MetaInfo';
import { PaymentFlow } from '../../../../common/models/PaymentFlow';
/**
 * Creates a request to initiate a order for SDK Integration
 * 1. For Standard Checkout -> CreateSdkOrderRequest.StandardCheckoutBuilder()
 * 2. For Custom Checkout -> CreateSdkOrderRequest.CustomCheckoutBuilder()
 */
export declare class CreateSdkOrderRequest {
    merchantOrderId: string;
    amount: number;
    paymentFlow: PaymentFlow;
    metaInfo?: MetaInfo;
    constraints?: InstrumentConstraint[];
    expireAfter?: number;
    constructor(merchantOrderId: string, amount: number, paymentFlow: PaymentFlow, metaInfo?: MetaInfo, expireAfter?: number, constraints?: InstrumentConstraint[]);
    static StandardCheckoutBuilder: () => StandardCheckoutBuilder;
    static CustomCheckoutBuilder: () => CustomCheckoutBuilder;
}
declare class CustomCheckoutBuilder {
    private _merchantOrderId;
    private _amount;
    private _metaInfo?;
    private _message;
    private _redirectUrl;
    private _constraints?;
    private _expireAfter?;
    /**
     * SETTERS
     */
    merchantOrderId: (merchantOrderId: string) => this;
    amount: (amount: number) => this;
    metaInfo: (metaInfo: MetaInfo) => this;
    message: (message: string) => this;
    redirectUrl: (redirectUrl: string) => this;
    constraints: (constraints: InstrumentConstraint[]) => this;
    expireAfter: (expireAfter: number) => this;
    build: () => CreateSdkOrderRequest;
}
declare class StandardCheckoutBuilder {
    private _merchantOrderId;
    private _amount;
    private _metaInfo?;
    private _message;
    private _redirectUrl;
    private _expireAfter?;
    /**
     * SETTERS
     */
    merchantOrderId: (merchantOrderId: string) => this;
    amount: (amount: number) => this;
    metaInfo: (metaInfo: MetaInfo) => this;
    message: (message: string) => this;
    redirectUrl: (redirectUrl: string) => this;
    expireAfter: (expireAfter: number) => this;
    build: () => CreateSdkOrderRequest;
}
export {};
