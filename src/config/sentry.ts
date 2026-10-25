import * as Sentry from '@sentry/react-native';

const PLACEHOLDER_DSN = 'PLACEHOLDER_SENTRY_DSN';

const getSentryDsn = () => process.env.EXPO_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;

export const initSentry = () => {
  const dsn = getSentryDsn();

  if (!dsn || dsn === PLACEHOLDER_DSN) {
    if (__DEV__) {
      console.log('[Sentry] Skipping init — no valid DSN configured');
    }
    return;
  }

  Sentry.init({
    dsn,
    debug: __DEV__,
    environment: process.env.APP_ENV || 'development',
    tracesSampleRate: 1.0,
    integrations: [Sentry.reactNativeTracingIntegration()],
    beforeSend(event) {
      if (__DEV__) {
        console.log('Sentry event:', event);
        return null;
      }
      return event;
    },
  });
};
