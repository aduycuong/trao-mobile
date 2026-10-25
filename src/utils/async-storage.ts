import type AsyncStorageStatic from '@react-native-async-storage/async-storage';

type AsyncStorageModule = typeof import('@react-native-async-storage/async-storage');

/**
 * Loaded lazily: the native module throws on import when the installed dev client was built
 * before it was added, and that would crash the whole app instead of just skipping persistence.
 */
export function getAsyncStorage(): typeof AsyncStorageStatic {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const storage = require('@react-native-async-storage/async-storage') as AsyncStorageModule;
  return storage.default;
}
