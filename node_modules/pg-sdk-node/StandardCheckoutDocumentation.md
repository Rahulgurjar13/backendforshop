# PhonePe B2B PG NODE

## Installation

Initial Requirements:

1. Node Version: v14.21
2. clientId
3. clientSecret
4. clientVersion

Install the dependency using npm

```javascript
npm i https://phonepe.mycloudrepo.io/public/repositories/phonepe-pg-sdk-node/releases/v2/phonepe-pg-sdk-node.tgz
```

## Quick start:

To get your keys, please visit the Merchant Onboarding of PhonePe
PG: [Merchant Onboarding](https://developer.phonepe.com/v1/docs/merchant-onboarding)

You will need three things to get started: `clientId`, `clientSecret` & `clientVersion`

### [Class Initialisation](#class-initialization)

To create an instance of the `StandardCheckoutClient` class, you need to provide the keys received at the time of onboarding.

Example:

```javascript
import {StandardCheckoutCliet, Env} from 'pg-sdk-node';

const clientId:string = "<clientId>";
const clientSecret:string = "<clientSecret>";
const clientVersion:string = 1;  //insert your client version here
const env:Env = Env.SANDBOX;      //change to Env.PRODUCTION when you go live

const client = StandardCheckoutClient.getInstance(clientId, clientSecret, clientVersion, env);
```

---

### Initiate an order using Checkout Page

To init a pay request, we make a request using [StandardCheckoutPayRequest.buidler()](#standard-checkout-pay-request-builder)

You will get to initiate the order using the `pay` function: [PAY](#pay-function)

###### Code:

```javascript
import { StandardCheckoutPayRequest } from 'pg-sdk-node';
import { v4 as uuid } from 'uuid';

const merchantOrderId = uuid();
const amount = 100;
const redirectUrl = 'https://www.merchant.com/redirect';

const request = StandardCheckoutPayRequest.buidler()
  .merchantOrderId(merchantOrderId)
  .amount(amount)
  .redirectUrl(redirectUrl)
  .build();

client.pay(request).then((response) => {
  const checkoutPageUrl = response.redirectUrl;
});
```

The `checkoutPageUrl` you get can be handled by redirecting the user to that url on the front end.

---

### Check Status of a order

View the state for the order we just initiated. [checkOrderStatus](#order-status)

```javascript
import { OrderStatusResponse } from 'pg-sdk-node';

const merchantOrderId = '<merchantOrderId>'; //created at the time of order creation

client.getOrderStatus(merchantOrderId).then((response) => {
  const state = response.state;
});
```

You can extract the state from the response received

---

### Refund Initiation for a Completed Order

Initiate a refund for a order which is in completed state

```javascript
import { RefundResponse } from 'pg-sdk-node';
import { v4 as uuid } from 'uuid';

const refundId = uuid();
const originalMerchantOrderId = '<merchantOrderId>'; // merchantOrderId for which order has to be initiated
const amount = 100; //amount to be refund

const request = RefundRequest.builder()
  .amount(amount)
  .merchantRefundId(refundId)
  .originalMerchantOrderId(originalMerchantOrderId)
  .build();

client.refund(request).then((response) => {
  const state = response.state;
});
```

Merchant can extract the state of the refund, initially it will be `PENDING`

---

### Refund Status for the initiated Refund

Get the status of the refund initiated before

```javascript
import { RefundStatusResponse } from 'pg-sdk-node';
import { v4 as uuid } from 'uuid';

const refundId = '<refundId>'; //refundId used to initiate the refund

client.getRefundStatus(refundId).then((response) => {
  const state = response.state;
});
```

Merchant can extract the state of the refund.

---

### Transaction Status

Get the status of a particular transaction which is performed for a particular order

```javascript
import { OrderStatusResponse } from 'pg-sdk-node';

const transactionId = '<transactionId>'; // PhonePe transctionId

client.getTransactionStatus(transactionId).then((response) => {
  const state = response.paymentDetails[0].state;
});
```

Merchant can extract the state of the transaction from the paymentDetails object

---

### Create SDK Order Integration

The `createSdkOrder()` function is used to create an order for App Integration

```javascript
import {v4 as uuid} from 'uuid';
import {CreateSdkOrderRequest} from 'pg-sdk-node';

const merchantOrderId:string = uuid();
const amount:number = 1000;
const redirectUrl:string = "https://redirectUrl.com";

const request = CreateSdkOrderRequest.StandardCheckoutBuilder()
        .merchantOrderId(merchantOrderId)
        .amount(amount)
        .redirectUrl(redirectUrl)
        .build();

client.createSdkOrder(request).then((response) => {
    const token = response.token
})
```

Returns a CreakeSdkOrderResponse object fields.
<br>Merchant should retrieve the token from the received response.

---

### Callback Handling

You will receive a callback you have configured in the dashboard
<br>It is important to check the validity of the callback received from PhonePe using the `validateCallback()` function.

`username` and `password` are configured in the dashboard

```javascript
import { CallbackResponse } from 'pg-sdk-node';

const username = '<username>';
const password = '<password>';
const authorization = '<authorization'; // received in the response headers
const responseBody = '<responseBody>'; // received in the response body

const callbackResponse = standardCheckoutClient.validateCallback(
  username,
  password,
  authorization,
  responseBody
);

const orderId = callbackResponse.payload.orderId;
const state = callbackResponse.payload.state;
```

`validateCallback` will throw PhonePeException, if the callback is invalid.

---

### Error Handling:

##### Sample:

```javascript
import {
  StandardCheckoutPayRequest,
  StandardCheckoutPayResponse,
} from 'pg-sdk-node';
import { v4 as uuid } from 'uuid';

const merchantOrderId = uuid();
const redirectUrl = 'https://www.merchant.com/redirect';

const request = StandardCheckoutPayRequest.buidler()
  .merchantOrderId(merchantOrderId)
  .redirectUrl(redirectUrl)
  .build();

client.pay(request).then((response) => {
  const checkoutPageUrl = response.redirectUrl;
}).catch((error) => {
    const error = error as PhonePeException;  //error thrown is of PhonePeException type
    console.log(error.message);
});
```
