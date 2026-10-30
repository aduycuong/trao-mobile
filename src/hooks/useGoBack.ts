import { useRouter, type Href } from 'expo-router';

/** Goes back in the stack, or to `fallback` when the screen was opened first (a push, a link). */
export function useGoBack(fallback: Href) {
  const router = useRouter();
  return () => {
    if (router.canGoBack()) router.back();
    else router.replace(fallback);
  };
}
