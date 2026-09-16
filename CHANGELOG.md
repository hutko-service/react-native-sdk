# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-09-16

### Fixed

- **Google Pay 3DS confirmation.** Payments that require a 3-D Secure challenge now
  complete reliably. `CloudipspWebView` detects the gateway's final redirect
  scheme-agnostically (the WebView reports `https://…` while the configured
  callback/API host may be scheme-less) and now also recognizes the acquirer
  callback at `…/api/checkout/callback_pub`. Previously this redirect was not
  matched, so the 3DS confirmation could hang and the `googlePay()` promise never
  resolved.

### Changed

- **Merchant configuration.** The `Cloudipsp` constructor now accepts optional
  `baseUrl` and `callbackUrl` arguments, defaulting to the production gateway
  values, so a merchant can target a custom/staging environment:
  `new Cloudipsp(merchantId, payConfirmator, baseUrl?, callbackUrl?)`. The
  `baseUrl` field is now public and can be read after construction (a trailing
  slash is normalized automatically).
