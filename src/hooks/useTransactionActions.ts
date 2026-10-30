import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { DEAL_QUERY_ROOTS } from '@/hooks/useDealActions';
import {
  cancelTransactionRequest,
  confirmTransactionRequest,
} from '@/services/transactions/transactions-api';
import type { TransactionCancelReason } from '@/types/deals';

/**
 * What a person can do to a deal in progress: confirm it is done, or cancel it. Both change the
 * deal, the item, the listings and the chat, so everything that shows them is read again.
 */
export function useTransactionActions() {
  const queryClient = useQueryClient();
  const { getIdToken } = useAuth();
  const [pending, setPending] = useState(0);
  const running = useRef(0);

  async function run(action: (token: string) => Promise<unknown>, fallback: string) {
    running.current += 1;
    setPending(running.current);
    try {
      await action(await getIdToken());
      return true;
    } catch (error) {
      Alert.alert(fallback, error instanceof Error ? error.message : 'Thử lại sau.');
      return false;
    } finally {
      await Promise.all([
        ...DEAL_QUERY_ROOTS.map((queryKey) =>
          queryClient.invalidateQueries({ queryKey: [queryKey] })
        ),
        queryClient.invalidateQueries({ queryKey: ['feed'] }),
      ]);
      running.current -= 1;
      setPending(running.current);
    }
  }

  return {
    busy: pending > 0,
    confirm: (transactionId: string) =>
      run((token) => confirmTransactionRequest(token, transactionId), 'Không xác nhận được'),
    cancel: (transactionId: string, body: { reason: TransactionCancelReason; note?: string }) =>
      run(
        (token) => cancelTransactionRequest(token, transactionId, body),
        'Không huỷ được giao dịch'
      ),
  };
}
