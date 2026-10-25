import 'react-native-gesture-handler';
import './global.css';
import { initSentry } from '@config/sentry';

if (__DEV__) {
  const defaultHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error('[GlobalError]', isFatal ? 'FATAL' : 'ERROR', error);
    defaultHandler(error, isFatal);
  });
}

try {
  initSentry();
} catch (error) {
  console.error('[Sentry] Failed to initialize:', error);
}

// eslint-disable-next-line import/first -- expo-router entry must load after side effects
import 'expo-router/entry';
