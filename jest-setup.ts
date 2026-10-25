import '@testing-library/jest-native/extend-expect';

// Reanimated 4 runs on react-native-worklets, which needs its own mock under Jest.
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  // Not covered by the official mock; animations stay off in tests anyway.
  Reanimated.useReducedMotion ??= () => true;
  return Reanimated;
});

// Mock expo-status-bar
jest.mock('expo-status-bar', () => ({
  StatusBar: 'StatusBar',
}));

// Mock expo-splash-screen
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn().mockResolvedValue(undefined),
  hideAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock Sentry
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  wrap: (component: any) => component,
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  setUser: jest.fn(),
  setContext: jest.fn(),
  setTag: jest.fn(),
  setExtra: jest.fn(),
}));
