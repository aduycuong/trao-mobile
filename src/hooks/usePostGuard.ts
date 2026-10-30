import { useQuery } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { fetchMyProfile, MY_PROFILE_QUERY_KEY } from '@/services/profile/profile-api';
import { formatWarning } from '@/utils/format';

/**
 * Asks before posting: a Vàng or Đỏ card blocks new listings (Thêm đồ still works). The server
 * refuses the same action, so this only says why before the tap does nothing.
 */
export function usePostGuard() {
  const { session, getIdToken } = useAuth();
  const { data: profile } = useQuery({
    queryKey: [...MY_PROFILE_QUERY_KEY, session?.uid],
    queryFn: async () => fetchMyProfile(await getIdToken()),
    enabled: !!session,
    staleTime: 60_000,
  });

  /** True when posting may go on; otherwise tells the user why not. */
  return function guard(): boolean {
    const warning = profile?.warning;
    if (!warning) return true;
    Alert.alert(
      'Chưa đăng tin được',
      `Tài khoản đang bị ${formatWarning(warning)}. Bạn vẫn thêm đồ vào Kho đồ được.`
    );
    return false;
  };
}
