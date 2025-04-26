# PhonePe B2B PG SDK

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

To create an instance of the `CustomCheckoutClient` class, you need to provide the keys received at the time of onboarding.

Example:

```javascript
import {CustomCheckoutClient, Env} from 'pg-sdk-node'

const clientId:string = "<clientId>";
const clientSecret:string = "<clientSecret>";
const clientVersion:number = 1;  //insert your client version here
const env = Env.SANDBOX;      //change to Env.PRODUCTION when you go live

const client = CustomCheckoutClient.getInstance(clientId, clientSecret, clientVersion, env);
```

### [Initiate an order](#pay-instruments)

To create a pay request, merchant can use `CustomCheckoutPayRequest` builder. Multiple builders are implemented according to the instruments.

You will get to initiate the order using the `pay()` function: [PAY](#pay-function)

The response received will be like `CustomCheckoutPayResponse` object

### [1. UPI_INTENT](#1-using-upi_intent)

##### Example:

```javascript
import { CustomCheckoutPayRequest } from 'pg-sdk-node';
import { v4 as uuid } from 'uuid';

const merchantOrderId = uuid();
const amount = 100;
const deviceOS = 'IOS';
const targetApp = 'PHONEPE';

const request = CustomCheckoutPayRequest.UpiIntentPayRequestBuilder()
  .merchantOrderId(merchantOrderId)
  .amount(amount)
  .targetApp(targetApp)
  .deviceOS(deviceOS)
  .build();

cliet.pay(request).then((response) => {
  const intentUrl = response.intentUrl;
});
```

Extract the `intentUrl` from the response received

### [2. UPI_COLLECT_VIA_VPA](#2-using-upi_collect_via_vpa)

Example:

```javascript
import {CustomCheckoutPayRequest} from 'pg-sdk-node';
import {v4 as uuid} from 'uuid';

const merchantOrderId = uuid()
const amount = 100;
const deviceOS = "IOS";
const vpa = "<REPLACE_WITH_REQUIRED_VPA>";

cosnt request = CustomCheckoutPayRequest.UpiCollectPayViaVpaRequestBuilder()
        .vpa(vpa)
        .amount(amount)
        .deviceOS(deviceOS)
        .merchantOrderId(merchantOrderId)
        .message("collect_message")
        .build();

client.pay(request).then((response) => {
    const state = response.state;
})
```

It will raise a collect request on above-mentioned `vpa`

### [3. UPI_QR](#3-using-upi_qr)

Example:

```javascript
import { CustomCheckoutPayRequest } from 'pg-sdk-node';
import { v4 as uuid } from 'uuid';

const merchantOrderId = uuid();
const amount = 100;
const deviceOS = 'IOS';

const request = CustomCheckoutPayRequest.UpiQrRequestBuilder()
  .amount(amount)
  .deviceOS(deviceOS)
  .merchantOrderId(merchantOrderId)
  .build();

client.pay(request).then((response) => {
  const qrData = response.qrData;
});
```

Extract the `qrData` from the response received

### [4. NET_BANKING]()

Example:

```javascript
import { CustomCheckoutPayRequest } from 'pg-sdk-node';
import { v4 as uuid } from 'uuid';

const merchantOrderId = uuid();
const amount = 100;
const bankId = 'HDFC';
const merchantUserId = '';

const request = CustomCheckoutPayRequest.NetBankingPayRequestBuilder()
  .merchantOrderId(merchantOrderId)
  .amount(amount)
  .bankId(bankId)
  .merchantUserId(merchantUserId)
  .build();

client.pay(request).then((response) => {
  const redirectUrl = response.redirectUrl;
});
```

Extract the `redirectUrl` from the response received to direct the user to the bank netbanking page

### [5. TOKEN]()

Example:

```javascript
import { CustomCheckoutPayRequest } from 'pg-sdk-node';
import { v4 as uuid } from 'uuid';

const merchantOrderId = uuid();
const amount = 100;
const encryptionKeyId = 1;
const encryptedCvv = '<ENCRYPTED_CVV>';
const authMode = '<AUTH_MODE>';
const panSuffix = '<PAN_SUFFIX>';
const cryptogram = '<CRYPTOGRAM>';
const encryptedToken = '<ENCRYPTED_TOKEN>';
const merchantUserId = '<MERCHANT_USER_ID>';
const cardHolderName = '<CARD_HOLDER_NAME>';
const redirectUrl = 'https://redirecturl.com';
const expiryYear = '<EXPIRY_YEAR>';
const expiryMonth = '<EXPIRY_MONTH>';

const request = CustomCheckoutPayRequest.TokenPayRequestBuilder()
  .merchantOrderId(merchantOrderId)
  .amount(amount)
  .encryptionKeyId(encryptionKeyId)
  .encryptedCvv(encryptedCvv)
  .authMode(authMode)
  .panSuffix(panSuffix)
  .cryptogram(cryptogram)
  .encryptedToken(encryptedToken)
  .merchantUserId(merchantUserId)
  .cardHolderName(cardHolderName)
  .expiryMonth(expiryMonth)
  .expiryYear(expiryYear)
  .build();

client.pay(request).then((response) => {
  const redirectUrl = response.redirectUrl;
});
```

Extract the `redirectUrl` from the response used to direct the user from the

### [6. CARD]()

Example:

```javascript
import { CustomCheckoutPayRequest } from 'pg-sdk-node';
import { v4 as uuid } from 'uuid';

const merchantOrderId = uuid();
const amount = 100;
const encryptionKeyId = 1;
const authMode = '<AUTH_MODE>';
const encryptedCardNumber = '<ENCRYPTED_CARD_NUMBER>';
const encryptedCvv = '<ENCRYPTED_CVV>';
const cardHolderName = '<CARD_HOLDER_NAME>';
const expiryYear = '<EXPIRY_YEAR>';
const expiryMonth = '<EXPIRY_MONTH>';
const redirectUrl = 'https://redirecturl.com';
const merchantUserId = '<MERCHANT_USER_ID>';

const request = CustomCheckoutPayRequest.CardPayRequestBuilder()
  .merchantOrderId(merchantOrderId)
  .amount(amount)
  .encryptionKeyId(encryptionKeyId)
  .encryptedCvv(encryptedCvv)
  .authMode(authMode)
  .merchantUserId(merchantUserId)
  .encryptedCardNumber(encryptedCardNumber)
  .cardHolderName(cardHolderName)
  .expiryMonth(expiryMonth)
  .expiryYear(expiryYear)
  .build();

client.pay(request).then((response) => {
  const redirectUrl = response.redirectUrl;
});
```


---

### [Check Status of an order](#order-status)

View the state for the order we just initiated.

Example:

```javascript

String merchantOrderId = "<merchantOrderId>";  //created at the time of order creation

client.getOrderStatus(merchantOrderId).then((response)=>{
    const state = response.state
})
```

The function returns a [OrderStatusResponse](#orderstatusresponse-properties) object from which merchant can
retrieve the status of the order.

---

### [Callback Handling](#callback-verification)

Merchant will receive a callback configured on the dashboard. They have to call the `validateCallback()` function.

It is important to check the validity of the callback received from PhonePe.

Example:

```javascript
const username = "<username>";
const password = "<password>";
const authorization = "<authorization";
const responseBody = "<responseBody>";

const callbackResponse = client.validateCallback(username, password, authorization, responseBody);

String orderId = callbackResponse.payload.orderId
String state = callbackResponse.payload.state
```

The `validateCallback()` function returns a [CallbackResponse](#callbackresponse), if the callback is valid, otherwise a
`PhonePeException` thrown.

---

### [Refund Initiation]()

Merchant can initiate a refund for the completed order, by calling `refund()` function

Example:
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
Merchant can extract the state of the refund, initially it will be `PENDING`. The response object will be like `RefundResponse`

### [Refund Status:]()

Get the status of the refund initiated before

```javascript
import { RefundStatusResponse } from 'pg-sdk-node';

const refundId = '<refundId>'; //refundId used to initiate the refund

client.getRefundStatus(refundId).then((response) => {
  const state = response.state;
});
```

Merchant can extract the state of the refund.
___

### [Transaction Status]()

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

### [Create Sdk Order Integration](#create-sdk-order)

The `createSdkOrder()` function is used to create an order

Example:

```javascript
import { CreateSdkOrderRequest } from 'pg-sdk-node';
import { v4 as uuid } from 'uuid';

const merchantOrderId = uuid();
const amount = 1000;

const request = CreateSdkOrderRequest.CustomCheckoutBuilder()
  .merchantOrderId(merchantOrderId)
  .amount(amount)
  .build();

client.pay(request).then((response) => {
  const token = response.token;
});
```

Merchant should retrieve the token from the response object [CreateSdkOrderResponse](#createsdkorderresponse-properties)