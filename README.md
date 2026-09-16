<img src="Logo.png" alt="SDK Logo" width="552" />

# react-native-hutko-service

React Native SDK for accepting payments (card, Google Pay, Apple Pay) through the
Hutko / Cloudipsp payment gateway, including 3-D Secure (3DS) confirmation handled
in an in-app WebView.

- 💳 Direct card payments with built-in card input components
- 🅶 Google Pay (Android)
- 🍎 Apple Pay (iOS)
- 🔐 3DS confirmation via `CloudipspWebView`

---

## Requirements

- React Native `0.71+` (tested on `0.78`)
- [`react-native-webview`](https://github.com/react-native-webview/react-native-webview) — **required peer dependency** (used for the 3DS confirmation screen)

---

## Installation

**English** — add the library and its peer dependency:

```bash
npm install github:hutko-service/react-native-sdk
npm install react-native-webview
```

or with Yarn:

```bash
yarn add github:hutko-service/react-native-sdk
yarn add react-native-webview
```

**Українською** — встановіть бібліотеку та її залежність:

```bash
npm install github:hutko-service/react-native-sdk
npm install react-native-webview
```

iOS only — install pods:

```bash
cd ios && pod install
```

---

## Android setup (Google Pay)

The SDK references the Google Pay (Wallet) classes as **`compileOnly`** dependencies,
so the **consuming app must add them at runtime**. Without them, calling
`googlePay()` throws `NoClassDefFoundError: com.google.android.gms.wallet.PaymentDataRequest`.

Add to your app module's `android/app/build.gradle`:

```gradle
dependencies {
    // Required for Google Pay support (the SDK declares these compileOnly).
    // Pinned to 17.0.0 to match the API the SDK was compiled against.
    implementation("com.google.android.gms:play-services-wallet:17.0.0")
    implementation("com.google.android.gms:play-services-base:17.0.0")
}
```

Enable the Wallet API in your app's `AndroidManifest.xml`, inside `<application>`:

```xml
<meta-data
    android:name="com.google.android.gms.wallet.api.enabled"
    android:value="true" />
```

---

## iOS setup (Apple Pay)

Enable the **Apple Pay** capability for your app target and configure your merchant
identifier in Xcode. Apple Pay is only available on physical iOS devices with a card
configured in Wallet.

---

## Usage

### 1. Create a `Cloudipsp` instance

```ts
import { Cloudipsp, CloudipspWebView } from 'react-native-hutko-service'

const cloudipsp = new Cloudipsp(
  merchantId,        // number — your Hutko/Cloudipsp merchant id
  payConfirmator,    // (webView) => webView — provides the CloudipspWebView for 3DS
  baseUrl,           // optional string — defaults to the production API
  callbackUrl,       // optional string — defaults to the standard callback URL
)
```

- **`merchantId`** — your merchant id.
- **`payConfirmator`** — a callback that returns the mounted `CloudipspWebView`
  instance. This is where you make the WebView visible so a 3DS challenge can be shown.
- **`baseUrl`** *(optional)* — override the gateway base URL (e.g. for a staging
  environment). Trailing slash is normalized automatically. `Cloudipsp.baseUrl` is a
  public field and may be read after construction.
- **`callbackUrl`** *(optional)* — override the payment callback URL.

### 2. Render the 3DS WebView

Keep a `ref` to a `CloudipspWebView` and mount it when a confirmation is in progress:

```tsx
const webViewRef = useRef<CloudipspWebView>(null)

// ...
return <CloudipspWebView ref={webViewRef} />
```

Wire the ref into the `Cloudipsp` constructor's confirmator:

```ts
const cloudipsp = new Cloudipsp(merchantId, (payConfirmator) => {
  setWebViewVisible(true)          // reveal the WebView
  return payConfirmator(webViewRef.current!)
})
```

To let the user close an in-progress 3DS window (rejecting the pending payment
promise instead of leaving it hanging), call `cancel()`:

```tsx
<Button title="Close" onPress={() => webViewRef.current?.cancel()} />
```

### 3. Build an order

```ts
import { Order } from 'react-native-hutko-service'

const order = new Order(
  1,                     // amount (in the currency's minor→major unit per your config)
  'UAH',                 // currency
  `order_${Date.now()}`, // unique order id
  'Test payment',        // description
  'customer@example.com',// email
)
```

### 4. Take a payment

**Card:**

```ts
const receipt = await cloudipsp.pay(card, order)
```

**Google Pay (Android):**

```ts
if (await Cloudipsp.supportsGooglePay()) {
  const receipt = await cloudipsp.googlePay(order)
}
```

**Apple Pay (iOS):**

```ts
if (await Cloudipsp.supportsApplePay()) {
  const receipt = await cloudipsp.applePay(order)
}
```

All three resolve to a `Receipt` (with `order_status`, `payment_id`, masked card,
etc.) once any required 3DS challenge has completed. If a 3DS challenge is required,
the `CloudipspWebView` shows it and resolves automatically when the gateway redirects
to the callback URL.

---

## Example app

A full working example (card, Google Pay and Apple Pay) lives in [`Example/`](./Example).
See `Example/src` for the payment screens and `Example/android/app/build.gradle` for the
Google Pay dependency setup described above.

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
