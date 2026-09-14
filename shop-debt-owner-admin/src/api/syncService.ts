import { supabase, isSupabaseConfigured } from './supabase';

const QUEUE_KEY = 'dostlik_sync_queue';

export interface SyncQueueItem {
  id: string;
  action: 'create_entry' | 'update_entry' | 'pay_entry' | 'delete_entry';
  payload: any;
  timestamp: string;
  attempts: number;
}

export const syncService = {
  // Get pending queue from localStorage
  getQueue(): SyncQueueItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  // Save queue
  saveQueue(queue: SyncQueueItem[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  },

  // Add an item to sync queue
  enqueue(action: SyncQueueItem['action'], payload: any): void {
    const queue = this.getQueue();
    const item: SyncQueueItem = {
      id: 'sync-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
      action,
      payload,
      timestamp: new Date().toISOString(),
      attempts: 0,
    };
    queue.push(item);
    this.saveQueue(queue);

    // Attempt to sync immediately if online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      this.syncPending();
    }
  },

  // Process pending sync queue to Supabase
  async syncPending(): Promise<{ synced: number; remaining: number }> {
    if (!isSupabaseConfigured()) {
      return { synced: 0, remaining: 0 };
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { synced: 0, remaining: this.getQueue().length };
    }

    const queue = this.getQueue();
    if (queue.length === 0) return { synced: 0, remaining: 0 };

    const remainingItems: SyncQueueItem[] = [];
    let syncedCount = 0;

    for (const item of queue) {
      try {
        if (item.action === 'create_entry') {
          const entry = item.payload;
          const toInsert: any = {
            direction: entry.direction,
            party_name: entry.party_name,
            party_phone: entry.party_phone || null,
            amount: entry.amount,
            status: entry.status,
            description: entry.description || null,
            due_date: entry.due_date || null,
            paid_at: entry.paid_at || null,
            recorded_by_name: entry.recorded_by_name || null,
          };
          if (entry.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(entry.id)) {
            toInsert.id = entry.id;
          }
          if (entry.created_by && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(entry.created_by)) {
            toInsert.created_by = entry.created_by;
            toInsert.last_edited_by = entry.created_by;
          }

          const { error } = await supabase.from('entries').upsert(toInsert);
          if (error) throw error;
          syncedCount++;

        } else if (item.action === 'pay_entry') {
          const { id, amount, status, paid_at, confirmed_by_name } = item.payload;
          const { error } = await supabase
            .from('entries')
            .update({
              amount,
              status,
              paid_at,
              confirmed_by_name,
              updated_at: new Date().toISOString(),
            })
            .eq('id', id);
          if (error) throw error;
          syncedCount++;
        } else if (item.action === 'update_entry') {
          const { id, ...patch } = item.payload;
          delete patch.creator_profile;
          const { error } = await supabase
            .from('entries')
            .update({ ...patch, updated_at: new Date().toISOString() })
            .eq('id', id);
          if (error) throw error;
          syncedCount++;
        } else if (item.action === 'delete_entry') {
          const { id, reason } = item.payload;
          await supabase.rpc('delete_entry_with_snapshot', {
            p_entry_id: id,
            p_reason: reason || 'Offline navbatdan o‘chirildi',
          });
          syncedCount++;
        }
      } catch (err) {
        console.warn(`[SyncService] Xatolik item ${item.id}:`, err);
        item.attempts += 1;
        if (item.attempts < 10) {
          remainingItems.push(item);
        }
      }
    }

    this.saveQueue(remainingItems);
    return { synced: syncedCount, remaining: remainingItems.length };
  },

  // Initialize event listeners for online reconnection
  initAutoSync(onSyncComplete?: () => void): () => void {
    if (typeof window === 'undefined') return () => {};

    const handleOnline = () => {
      console.log('[SyncService] Internet qayta ulandi, navbatdagi maʼlumotlar bazaga yuklanmoqda...');
      this.syncPending().then(({ synced }) => {
        if (synced > 0 && onSyncComplete) {
          onSyncComplete();
        }
      });
    };

    window.addEventListener('online', handleOnline);
    if (navigator.onLine) {
      this.syncPending().then(({ synced }) => {
        if (synced > 0 && onSyncComplete) {
          onSyncComplete();
        }
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  },
};
