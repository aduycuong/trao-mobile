import React from 'react';
import { RequireSession } from '@/components/auth/require-session';
import { CurrentPenaltyRedirect } from '@/components/penalties/current-penalty-redirect';

/** `/penalty`: opens the card the user is under now; with none, tells so. */
export default function CurrentPenaltyRoute() {
  return (
    <RequireSession>
      <CurrentPenaltyRedirect />
    </RequireSession>
  );
}
