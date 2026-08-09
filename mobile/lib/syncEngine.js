import { getPendingExpenses, removePendingExpense } from './offlineQueue';
import { createExpense } from '@/api/expenses';

let isSyncing = false;

export async function syncPendingExpenses(onProgress) {
  if (isSyncing) {
    return; // avoid overlapping sync runs if triggered twice in quick succession
  }
  isSyncing = true;

  try {
    const pending = await getPendingExpenses();
    let syncedCount = 0;

    for (const entry of pending) {
      try {
        await createExpense(entry.data);
        await removePendingExpense(entry.localId);
        syncedCount += 1;
        if (onProgress) {
          onProgress(syncedCount, pending.length);
        }
      } catch (err) {
        // Leave this entry in the queue - it'll retry on the next sync
        // trigger. A single bad entry shouldn't block the rest of the
        // queue from syncing.
        console.log('Failed to sync entry, will retry later:', entry.localId, err);
      }
    }
  } finally {
    isSyncing = false;
  }
}