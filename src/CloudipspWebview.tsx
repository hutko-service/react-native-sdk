import React from 'react';
import {Platform, StyleSheet, View} from 'react-native';
import {
  WebView,
  WebViewErrorEvent,
  WebViewNavigationEvent,
} from 'react-native-webview';

import {Failure} from './models';
import {Native} from './Native';

const addViewportMeta = `(${String(() => {
  const meta = document.createElement('meta');
  meta.setAttribute('content', 'width=device-width, user-scalable=0,');
  meta.setAttribute('name', 'viewport');
  const elementHead = document.getElementsByTagName('head');
  if (elementHead) {
    elementHead[0].appendChild(meta);
  } else {
    const head = document.createElement('head');
    head.appendChild(meta);
  }
})})();`;

interface Props {}

interface LoadingState {
  baseUrl: string;
  html: string;
  cookies: string | null;
  apiHost: string;
  callbackUrl: string;
}

type State = {status: 'idle'} | ({status: 'loading'} & LoadingState);

export class CloudipspWebView extends React.Component<Props, State> {
  state: State = {status: 'idle'};

  private readonly webViewRef = React.createRef<WebView>();
  private onSuccess?: () => void;
  private onFailure?: (error: Failure) => void;

  readonly confirm = (
    baseUrl: string,
    html: string,
    cookies: string | null,
    apiHost: string,
    callbackUrl: string,
  ): Promise<void> => {
    if (this.onSuccess) {
      throw new Error('CloudipspWebView already waiting for confirmation');
    }

    if (cookies && Platform.OS === 'android') {
      Native.addCookies(baseUrl, cookies);
    }

    this.setState({
      status: 'loading',
      baseUrl,
      html,
      cookies,
      apiHost,
      callbackUrl,
    });

    return new Promise((resolve, reject) => {
      this.onSuccess = resolve;
      this.onFailure = reject;
    });
  };

  private readonly onLoadStart = (event: WebViewNavigationEvent) => {
    if (!this.onSuccess || this.state.status !== 'loading') {
      return;
    }

    const {apiHost, callbackUrl} = this.state;
    const url = event.nativeEvent.url;

    // Compare scheme-agnostically: the WebView reports the final redirect with
    // its real scheme (https), while callbackUrl/apiHost may be scheme-less.
    const stripScheme = (value: string) => value.replace(/^https?:\/\//, '');
    const normalizedUrl = stripScheme(url);

    const detectsCallbackUrl = normalizedUrl.startsWith(stripScheme(callbackUrl));
    const detectsCallbackPub = normalizedUrl.startsWith(
      `${stripScheme(apiHost)}/api/checkout/callback_pub`,
    );

    if (detectsCallbackUrl || detectsCallbackPub) {
      this.settleSuccess();
    }
  };

  private readonly onError = (event: WebViewErrorEvent) => {
    if (!this.onFailure || this.state.status !== 'loading') {
      return;
    }

    const {description, code} = event.nativeEvent;
    this.settleFailure(
      new Failure(
        description || 'WebView failed to load the confirmation page',
        code != null ? String(code) : undefined,
      ),
    );
  };

  /**
   * Cancels a confirmation in progress. Call this from the host component when
   * the user closes the payment window (e.g. a Close button or hardware back),
   * so the pending pay() / googlePay() / applePay() promise rejects instead of
   * hanging. No-op when no confirmation is in progress.
   */
  readonly cancel = (reason: string = 'Payment window closed'): void => {
    if (!this.onFailure || this.state.status !== 'loading') {
      return;
    }

    this.settleFailure(new Failure(reason, 'canceled'));
  };

  private settleSuccess = () => {
    // The receipt is intentionally not parsed from the URL here: the caller
    // re-fetches the authoritative receipt via getOrder(token) once this
    // resolves. We only need to signal that the 3DS step has completed.
    // Clear callbacks synchronously first so a subsequent onError for the same
    // (unresolvable http://callback) navigation cannot also reject.
    const onSuccess = this.onSuccess;
    this.clearCallbacks();
    this.setState({status: 'idle'}, () => onSuccess?.());

    this.webViewRef.current?.goBack();
  };

  private settleFailure = (error: Failure) => {
    const onFailure = this.onFailure;
    this.clearCallbacks();
    this.setState({status: 'idle'}, () => onFailure?.(error));
  };

  private clearCallbacks = () => {
    this.onSuccess = undefined;
    this.onFailure = undefined;
  };

  render(): React.ReactNode {
    if (this.state.status === 'idle') {
      return <View />;
    }

    const {baseUrl, html} = this.state;

    return (
      <WebView
        style={styles.webView}
        ref={this.webViewRef}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scalesPageToFit={true}
        source={{baseUrl, html}}
        injectedJavaScript={addViewportMeta}
        onLoadStart={this.onLoadStart}
        onError={this.onError}
      />
    );
  }
}

const styles = StyleSheet.create({
  webView: {
    flex: 1,
  },
});

export type CloudipspWebviewProvider = (
  callback: (webView: CloudipspWebView) => void,
) => void;

export interface CloudipspWebviewPrivate {
  confirm(
    baseUrl: string,
    html: string,
    cookies: string | null,
    apiHost: string,
    callbackUrl: string,
  ): Promise<void>;
}
