import { supabase, isSupabaseConfigured } from './supabase';
import {
  Entry,
  EntryHistory,
  AdminActionLog,
  Profile,
  EntryFilters,
  DashboardMetrics,
  CustomerSummary,
  CustomerSortOption,
} from '../types/database';
import {
  INITIAL_MOCK_ENTRIES,
  INITIAL_MOCK_HISTORIES,
  INITIAL_MOCK_ACTION_LOGS,
  INITIAL_MOCK_PROFILES,
} from './mockData';
import { syncService } from './syncService';

// Local storage keys for interactive demo fallback
const STORAGE_ENTRIES = 'dostlik_entries';
const STORAGE_HISTORIES = 'dostlik_histories';
const STORAGE_LOGS = 'dostlik_action_logs';
const STORAGE_PROFILES = 'dostlik_profiles';

const isUUID = (str?: string): boolean => {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
};

const getStored = <T>(key: string, initial: T): T => {
  if (typeof window === 'undefined') return initial;
  const item = localStorage.getItem(key);
  if (!item) {
    localStorage.setItem(key, JSON.stringify(initial));
    return initial;
  }
  try {
    const parsed = JSON.parse(item);
    if (Array.isArray(initial) && !Array.isArray(parsed)) {
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    if (key === STORAGE_ENTRIES && Array.isArray(parsed)) {
      const cleaned = parsed.filter((e: any) => !e.id?.startsWith('entry-1'));
      if (cleaned.length !== parsed.length) {
        localStorage.setItem(key, JSON.stringify(cleaned));
        return cleaned as T;
      }
    }
    return parsed;
  } catch {
    localStorage.setItem(key, JSON.stringify(initial));
    return initial;
  }
};

const setStored = <T>(key: string, data: T) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(data));
  }
};

function getDateBounds(range?: string): { start?: string; end?: string } {
  if (!range || range === 'all') return {};
  const now = new Date();
  if (range === 'today') {
    const s = new Date(now);
    s.setHours(0, 0, 0, 0);
    return { start: s.toISOString() };
  }
  if (range === 'yesterday') {
    const s = new Date(now);
    s.setDate(s.getDate() - 1);
    s.setHours(0, 0, 0, 0);
    const e = new Date(s);
    e.setHours(23, 59, 59, 999);
    return { start: s.toISOString(), end: e.toISOString() };
  }
  if (range === 'this_week') {
    const s = new Date(now);
    s.setDate(s.getDate() - 7);
    s.setHours(0, 0, 0, 0);
    return { start: s.toISOString() };
  }
  if (range === 'this_month') {
    const s = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: s.toISOString() };
  }
  return {};
}

export const entriesService = {
  // ── 1. PROFILES & WORKERS ──────────────────────────────────
  async getProfiles(): Promise<Profile[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Profile[];
    }
    const current = getStored<Profile[]>(STORAGE_PROFILES, INITIAL_MOCK_PROFILES);
    if (!current || current.length !== 3 || !current.some((p: Profile) => p.id === 'user-sohibboy')) {
      setStored(STORAGE_PROFILES, INITIAL_MOCK_PROFILES);
      return INITIAL_MOCK_PROFILES;
    }
    return current;
  },

  async updatePinCode(userId: string, newPin: string): Promise<Profile> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('profiles')
        .update({ pin_code: newPin, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();
      if (error) throw error;
      return data as Profile;
    }

    const profiles = getStored<Profile[]>(STORAGE_PROFILES, INITIAL_MOCK_PROFILES);
    const updated = profiles.map((p) => (p.id === userId ? { ...p, pin_code: newPin, updated_at: new Date().toISOString() } : p));
    setStored(STORAGE_PROFILES, updated);
    const target = updated.find((p) => p.id === userId);
    if (!target) throw new Error('Foydalanuvchi topilmadi');
    return target;
  },

  async toggleWorkerStatus(workerId: string, isActive: boolean, adminUser: { id: string; name: string }): Promise<void> {
    const summary = isActive ? 'Ishchi hisobi qayta faollashtirildi' : 'Ishchi hisobi faolsizlantirildi (to‘xtatildi)';
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', workerId);
      if (error) throw error;

      await supabase.from('admin_action_log').insert({
        admin_user_id: adminUser.id,
        admin_name: adminUser.name,
        action_type: isActive ? 'worker_activate' : 'worker_deactivate',
        target_worker_id: workerId,
        summary: `${summary} (ID: ${workerId})`,
        metadata: { worker_id: workerId, is_active: isActive },
      });
      return;
    }

    const profiles = getStored<Profile[]>(STORAGE_PROFILES, INITIAL_MOCK_PROFILES);
    const updated = profiles.map((p) => (p.id === workerId ? { ...p, is_active: isActive } : p));
    setStored(STORAGE_PROFILES, updated);

    // log action
    const logs = getStored<AdminActionLog[]>(STORAGE_LOGS, INITIAL_MOCK_ACTION_LOGS);
    const newLog: AdminActionLog = {
      id: 'action-' + Date.now(),
      admin_user_id: adminUser.id,
      admin_name: adminUser.name,
      action_type: isActive ? 'worker_activate' : 'worker_deactivate',
      target_worker_id: workerId,
      summary,
      metadata: { is_active: isActive },
      created_at: new Date().toISOString(),
    };
    setStored(STORAGE_LOGS, [newLog, ...logs]);
  },

  async addWorker(workerData: { fullName: string; phone: string; email?: string }, adminUser: { id: string; name: string }): Promise<Profile> {
    const newId = 'worker-' + Date.now();
    const newProfile: Profile = {
      id: newId,
      role: 'worker',
      full_name: workerData.fullName,
      phone: workerData.phone,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      // Direct insert into profiles or via Supabase Admin Auth
      const { data, error } = await supabase.from('profiles').insert(newProfile).select().single();
      if (error) throw error;

      await supabase.from('admin_action_log').insert({
        admin_user_id: adminUser.id,
        admin_name: adminUser.name,
        action_type: 'worker_add',
        target_worker_id: data.id,
        summary: `Yangi ishchi qo‘shildi: ${workerData.fullName} (${workerData.phone})`,
        after_data: data,
      });

      return data as Profile;
    }

    const profiles = getStored<Profile[]>(STORAGE_PROFILES, INITIAL_MOCK_PROFILES);
    setStored(STORAGE_PROFILES, [newProfile, ...profiles]);

    const logs = getStored<AdminActionLog[]>(STORAGE_LOGS, INITIAL_MOCK_ACTION_LOGS);
    setStored(STORAGE_LOGS, [
      {
        id: 'action-' + Date.now(),
        admin_user_id: adminUser.id,
        admin_name: adminUser.name,
        action_type: 'worker_add',
        target_worker_id: newId,
        summary: `Yangi ishchi qo‘shildi: ${workerData.fullName} (${workerData.phone})`,
        after_data: newProfile as any,
        created_at: new Date().toISOString(),
      },
      ...logs,
    ]);

    return newProfile;
  },

  // ── 2. ENTRIES LIST & FILTERS ──────────────────────────────
  async getEntries(
    filters: EntryFilters = {},
    page = 1,
    pageSize = 15
  ): Promise<{ data: Entry[]; total: number }> {
    if (isSupabaseConfigured()) {
      let query = supabase.from('entries').select('*, creator_profile:profiles!created_by(*)', { count: 'exact' });

      if (filters.search?.trim()) {
        const s = `%${filters.search.trim()}%`;
        query = query.or(`party_name.ilike.${s},party_phone.ilike.${s},description.ilike.${s}`);
      }
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.direction && filters.direction !== 'all') {
        query = query.eq('direction', filters.direction);
      }
      if (filters.workerId && filters.workerId !== 'all') {
        query = query.eq('created_by', filters.workerId);
      }
      if (filters.minAmount !== undefined && filters.minAmount > 0) {
        query = query.gte('amount', filters.minAmount);
      }
      if (filters.maxAmount !== undefined && filters.maxAmount > 0) {
        query = query.lte('amount', filters.maxAmount);
      }
      const bounds = getDateBounds(filters.dateRange);
      const effectiveStart = filters.startDate || bounds.start;
      const effectiveEnd = filters.endDate || bounds.end;

      if (effectiveStart) {
        query = query.gte('created_at', effectiveStart);
      }
      if (effectiveEnd) {
        query = query.lte('created_at', effectiveEnd);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { data: (data as Entry[]) || [], total: count || 0 };
    }

    // Mock fallback with full filtering logic
    let items = getStored<Entry[]>(STORAGE_ENTRIES, INITIAL_MOCK_ENTRIES);
    // Auto-heal old entries if they used old worker IDs
    if (items.some((e) => e.created_by === 'worker-uuid-1' || (!e.recorded_by_name && e.created_by))) {
      items = INITIAL_MOCK_ENTRIES;
      setStored(STORAGE_ENTRIES, items);
    }
    const profiles = getStored<Profile[]>(STORAGE_PROFILES, INITIAL_MOCK_PROFILES);

    if (filters.search?.trim()) {
      const q = filters.search.toLowerCase().trim();
      items = items.filter(
        (e) =>
          e.party_name.toLowerCase().includes(q) ||
          (e.party_phone && e.party_phone.includes(q)) ||
          (e.description && e.description.toLowerCase().includes(q))
      );
    }
    if (filters.status && filters.status !== 'all') {
      items = items.filter((e) => e.status === filters.status);
    }
    if (filters.direction && filters.direction !== 'all') {
      items = items.filter((e) => e.direction === filters.direction);
    }
    if (filters.workerId && filters.workerId !== 'all') {
      items = items.filter((e) => e.created_by === filters.workerId);
    }
    if (filters.minAmount !== undefined && filters.minAmount > 0) {
      items = items.filter((e) => e.amount >= filters.minAmount!);
    }
    if (filters.maxAmount !== undefined && filters.maxAmount > 0) {
      items = items.filter((e) => e.amount <= filters.maxAmount!);
    }

    const bounds = getDateBounds(filters.dateRange);
    const effectiveStart = filters.startDate || bounds.start;
    const effectiveEnd = filters.endDate || bounds.end;

    if (effectiveStart) {
      items = items.filter((e) => new Date(e.created_at) >= new Date(effectiveStart));
    }
    if (effectiveEnd) {
      items = items.filter((e) => new Date(e.created_at) <= new Date(effectiveEnd));
    }

    // Populate creator and confirmer profiles
    const populated = items.map((item) => ({
      ...item,
      creator_profile: profiles.find((p) => p.id === item.created_by) || item.creator_profile || null,
      confirmer_profile: profiles.find((p) => p.id === item.confirmed_by) || item.confirmer_profile || null,
    }));

    const total = populated.length;
    const from = (page - 1) * pageSize;
    const paginated = populated.slice(from, from + pageSize);

    return { data: paginated, total };
  },

  // ── 3. SINGLE ENTRY WITH HISTORY ───────────────────────────
  async getEntryById(id: string): Promise<{ entry: Entry; history: EntryHistory[] }> {
    if (isSupabaseConfigured()) {
      const { data: entry, error: entryErr } = await supabase
        .from('entries')
        .select('*, creator_profile:profiles!created_by(*)')
        .eq('id', id)
        .single();
      if (entryErr) throw entryErr;

      const { data: history, error: histErr } = await supabase
        .from('entry_history')
        .select('*')
        .eq('entry_id', id)
        .order('created_at', { ascending: false });
      if (histErr) throw histErr;

      return { entry: entry as Entry, history: (history as EntryHistory[]) || [] };
    }

    const items = getStored<Entry[]>(STORAGE_ENTRIES, INITIAL_MOCK_ENTRIES);
    const profiles = getStored<Profile[]>(STORAGE_PROFILES, INITIAL_MOCK_PROFILES);
    const histories = getStored<EntryHistory[]>(STORAGE_HISTORIES, INITIAL_MOCK_HISTORIES);

    const found = items.find((e) => e.id === id);
    if (!found) throw new Error('Qarz yozuvi topilmadi.');

    const populatedEntry: Entry = {
      ...found,
      creator_profile: profiles.find((p) => p.id === found.created_by) || found.creator_profile || null,
      confirmer_profile: profiles.find((p) => p.id === found.confirmed_by) || found.confirmer_profile || null,
    };
    const entryHistories = histories.filter((h) => h.entry_id === id);

    return { entry: populatedEntry, history: entryHistories };
  },

  // ── 4. MANUAL ADD (OWNER ACTION LOGGED) ─────────────────────
  async createManualEntry(
    newEntryData: Omit<Entry, 'id' | 'created_at' | 'updated_at' | 'creator_profile'>,
    adminUser: { id: string; name: string }
  ): Promise<Entry> {
    const entryId = 'entry-' + Date.now();
    const nowStr = new Date().toISOString();

    const entryToInsert: Entry = {
      ...newEntryData,
      id: entryId,
      created_by: adminUser.id,
      recorded_by_name: adminUser.name,
      last_edited_by: adminUser.id,
      created_at: nowStr,
      updated_at: nowStr,
    };

    // 1. ALWAYS persist to LocalStorage first (Guarantees zero data loss even offline)
    const items = getStored<Entry[]>(STORAGE_ENTRIES, INITIAL_MOCK_ENTRIES);
    setStored(STORAGE_ENTRIES, [entryToInsert, ...items]);

    const histories = getStored<EntryHistory[]>(STORAGE_HISTORIES, INITIAL_MOCK_HISTORIES);
    setStored(STORAGE_HISTORIES, [
      {
        id: 'hist-' + Date.now(),
        entry_id: entryId,
        changed_by: adminUser.id,
        changed_by_name: adminUser.name,
        change_type: 'created',
        new_value: entryToInsert,
        created_at: nowStr,
      },
      ...histories,
    ]);

    const logs = getStored<AdminActionLog[]>(STORAGE_LOGS, INITIAL_MOCK_ACTION_LOGS);
    setStored(STORAGE_LOGS, [
      {
        id: 'action-' + Date.now(),
        admin_user_id: adminUser.id,
        admin_name: adminUser.name,
        action_type: 'manual_add',
        target_entry_id: entryId,
        summary: `Yangi ${entryToInsert.direction === 'customer' ? 'mijoz' : 'yetkazib beruvchi'} qarzi yozildi: ${entryToInsert.party_name} (${entryToInsert.amount} so‘m)`,
        after_data: entryToInsert,
        created_at: nowStr,
      },
      ...logs,
    ]);

    // 2. If Supabase is configured and online, attempt to upload to database
    if (isSupabaseConfigured() && typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const validAdminId = isUUID(adminUser.id) ? adminUser.id : null;
        const { data: inserted, error: insErr } = await supabase
          .from('entries')
          .insert({
            direction: newEntryData.direction,
            party_name: newEntryData.party_name,
            party_phone: newEntryData.party_phone,
            amount: newEntryData.amount,
            status: newEntryData.status,
            description: newEntryData.description,
            due_date: newEntryData.due_date,
            paid_at: newEntryData.status === 'paid' ? nowStr : null,
            created_by: validAdminId,
            recorded_by_name: adminUser.name,
            last_edited_by: validAdminId,
          })
          .select('*, creator_profile:profiles!created_by(*)')
          .single();

        if (insErr) throw insErr;

        if (inserted) {
          // Update local copy with database generated ID if applicable
          const updatedItems = getStored<Entry[]>(STORAGE_ENTRIES, INITIAL_MOCK_ENTRIES).map(
            (e) => (e.id === entryId ? { ...inserted, creator_profile: inserted.creator_profile } : e)
          );
          setStored(STORAGE_ENTRIES, updatedItems);
          return inserted as Entry;
        }
      } catch (dbErr) {
        console.warn('Supabase ga darhol yozilmadi, oflayn navbatga olindi:', dbErr);
        // Enqueue for background sync
        syncService.enqueue('create_entry', entryToInsert);
      }
    } else if (isSupabaseConfigured()) {
      // Offline: enqueue
      syncService.enqueue('create_entry', entryToInsert);
    }

    return entryToInsert;
  },

  // ── 5. OWNER EDIT (FULL FIELD CORRECTION & AUDIT) ───────────
  async updateEntry(
    id: string,
    updatedFields: Partial<Entry>,
    adminUser: { id: string; name: string }
  ): Promise<Entry> {
    const nowStr = new Date().toISOString();

    if (isSupabaseConfigured()) {
      const validAdminId = isUUID(adminUser.id) ? adminUser.id : null;
      // 1. Fetch before state
      const { data: beforeData, error: befErr } = await supabase
        .from('entries')
        .select('*')
        .eq('id', id)
        .single();
      if (befErr) throw befErr;

      // Handle paid_at auto-timestamping
      let paidAtValue = updatedFields.paid_at;
      if (updatedFields.status === 'paid' && !beforeData.paid_at && !paidAtValue) {
        paidAtValue = nowStr;
      } else if (updatedFields.status === 'open') {
        paidAtValue = null;
      }

      const patch: any = {
        ...updatedFields,
        paid_at: paidAtValue,
        last_edited_by: validAdminId,
        updated_at: nowStr,
      };
      delete patch.creator_profile;

      // 2. Perform update
      const { data: updatedData, error: upErr } = await supabase
        .from('entries')
        .update(patch)
        .eq('id', id)
        .select('*, creator_profile:profiles!created_by(*)')
        .single();
      if (upErr) throw upErr;

      // 3. Compute structured diff
      const diffChanges: Record<string, { old: any; new: any }> = {};
      Object.keys(updatedFields).forEach((k) => {
        const key = k as keyof Entry;
        if (beforeData[key] !== updatedData[key]) {
          diffChanges[k] = { old: beforeData[key], new: updatedData[key] };
        }
      });

      // 4. Log in entry_history
      await supabase.from('entry_history').insert({
        entry_id: id,
        changed_by: validAdminId,
        changed_by_name: adminUser.name,
        change_type: 'edited',
        changes: diffChanges,
        created_at: nowStr,
      });

      // 5. Log in admin_action_log
      await supabase.from('admin_action_log').insert({
        admin_user_id: validAdminId,
        admin_name: adminUser.name,
        action_type: 'edit',
        target_entry_id: id,
        summary: `Qarz tahrirlandi: ${updatedData.party_name} (${updatedData.amount} so‘m)`,
        before_data: beforeData,
        after_data: updatedData,
      });

      return updatedData as Entry;
    }

    // Mock storage
    const items = getStored<Entry[]>(STORAGE_ENTRIES, INITIAL_MOCK_ENTRIES);
    const existing = items.find((e) => e.id === id);
    if (!existing) throw new Error('Qarz topilmadi');

    let paidAt = updatedFields.paid_at;
    if (updatedFields.status === 'paid' && !existing.paid_at && !paidAt) {
      paidAt = nowStr;
    } else if (updatedFields.status === 'open') {
      paidAt = null;
    }

    const updatedEntry: Entry = {
      ...existing,
      ...updatedFields,
      paid_at: paidAt,
      last_edited_by: adminUser.id,
      updated_at: nowStr,
    };

    setStored(
      STORAGE_ENTRIES,
      items.map((e) => (e.id === id ? updatedEntry : e))
    );

    // Compute diff
    const diff: Record<string, { old: any; new: any }> = {};
    Object.keys(updatedFields).forEach((k) => {
      const key = k as keyof Entry;
      if (existing[key] !== updatedEntry[key]) {
        diff[k] = { old: existing[key], new: updatedEntry[key] };
      }
    });

    const histories = getStored<EntryHistory[]>(STORAGE_HISTORIES, INITIAL_MOCK_HISTORIES);
    setStored(STORAGE_HISTORIES, [
      {
        id: 'hist-' + Date.now(),
        entry_id: id,
        changed_by: adminUser.id,
        changed_by_name: adminUser.name,
        change_type: 'edited',
        changes: diff,
        created_at: nowStr,
      },
      ...histories,
    ]);

    const logs = getStored<AdminActionLog[]>(STORAGE_LOGS, INITIAL_MOCK_ACTION_LOGS);
    setStored(STORAGE_LOGS, [
      {
        id: 'action-' + Date.now(),
        admin_user_id: adminUser.id,
        admin_name: adminUser.name,
        action_type: 'edit',
        target_entry_id: id,
        summary: `Qarz tahrirlandi: ${updatedEntry.party_name} (${updatedEntry.amount} so‘m)`,
        before_data: existing,
        after_data: updatedEntry,
        created_at: nowStr,
      },
      ...logs,
    ]);

    return updatedEntry;
  },

  // ── 6. ATOMIC DELETE & PERMANENT SNAPSHOT ───────────────────
  // Satisfies Requirements 16, 17, 18
  async deleteEntryWithSnapshot(
    id: string,
    reason = '',
    adminUser: { id: string; name: string }
  ): Promise<void> {
    if (isSupabaseConfigured()) {
      // Call atomic PostgreSQL RPC function
      const { error } = await supabase.rpc('delete_entry_with_snapshot', {
        p_entry_id: id,
        p_reason: reason || 'Do‘kon egasi tomonidan o‘chirildi',
      });
      if (error) throw error;
      return;
    }

    // Mock storage atomic simulation
    const items = getStored<Entry[]>(STORAGE_ENTRIES, INITIAL_MOCK_ENTRIES);
    const existing = items.find((e) => e.id === id);
    if (!existing) throw new Error('O‘chiriladigan qarz topilmadi.');

    const histories = getStored<EntryHistory[]>(STORAGE_HISTORIES, INITIAL_MOCK_HISTORIES);
    const entryHistories = histories.filter((h) => h.entry_id === id);

    // 1. Capture snapshot into admin_action_log FIRST
    const logs = getStored<AdminActionLog[]>(STORAGE_LOGS, INITIAL_MOCK_ACTION_LOGS);
    const deleteLog: AdminActionLog = {
      id: 'action-' + Date.now(),
      admin_user_id: adminUser.id,
      admin_name: adminUser.name,
      action_type: 'delete',
      target_entry_id: id,
      summary: `Qarz butunlay o‘chirildi: ${existing.party_name} (${existing.amount} so‘m)`,
      deleted_entry_snapshot: existing,
      deleted_entry_history_snapshot: entryHistories,
      metadata: { reason, deleted_at: new Date().toISOString() },
      created_at: new Date().toISOString(),
    };
    setStored(STORAGE_LOGS, [deleteLog, ...logs]);

    // 2. Permanently delete entry and associated history
    setStored(
      STORAGE_ENTRIES,
      items.filter((e) => e.id !== id)
    );
    setStored(
      STORAGE_HISTORIES,
      histories.filter((h) => h.entry_id !== id)
    );
  },

  // ── 7. PAY OR REDUCE DEBT (PARTIAL OR FULL SETTLEMENT) ─────
  async payOrReduceDebt(
    id: string,
    paidAmount: number,
    adminUser: { id: string; name: string },
    note = ''
  ): Promise<{ updatedEntry: Entry; isFullyPaid: boolean; remainingAmount: number }> {
    const nowStr = new Date().toISOString();
    const validAdminId = isUUID(adminUser.id) ? adminUser.id : null;

    // 1. Update local storage first
    const items = getStored<Entry[]>(STORAGE_ENTRIES, INITIAL_MOCK_ENTRIES);
    const existing = items.find((e) => e.id === id);
    if (!existing) throw new Error('Qarz yozuvi topilmadi.');

    const currentAmount = Number(existing.amount) || 0;
    const isFullyPaid = paidAmount >= currentAmount;
    const newAmount = isFullyPaid ? currentAmount : currentAmount - paidAmount;
    const newStatus = isFullyPaid ? 'paid' : 'open';

    const updatedEntry: Entry = {
      ...existing,
      status: newStatus,
      paid_at: isFullyPaid ? nowStr : existing.paid_at,
      amount: newAmount,
      confirmed_by: isFullyPaid ? adminUser.id : existing.confirmed_by,
      confirmed_by_name: isFullyPaid ? adminUser.name : existing.confirmed_by_name,
      last_edited_by: adminUser.id,
      updated_at: nowStr,
    };

    setStored(
      STORAGE_ENTRIES,
      items.map((e) => (e.id === id ? updatedEntry : e))
    );

    const histories = getStored<EntryHistory[]>(STORAGE_HISTORIES, INITIAL_MOCK_HISTORIES);
    setStored(STORAGE_HISTORIES, [
      {
        id: 'hist-' + Date.now(),
        entry_id: id,
        changed_by: adminUser.id,
        changed_by_name: adminUser.name,
        change_type: isFullyPaid ? 'status_changed' : 'edited',
        changes: {
          amount: { old: currentAmount, new: newAmount },
          status: { old: existing.status, new: newStatus },
        },
        created_at: nowStr,
      },
      ...histories,
    ]);

    const logs = getStored<AdminActionLog[]>(STORAGE_LOGS, INITIAL_MOCK_ACTION_LOGS);
    setStored(STORAGE_LOGS, [
      {
        id: 'action-' + Date.now(),
        admin_user_id: adminUser.id,
        admin_name: adminUser.name,
        action_type: 'edit',
        target_entry_id: id,
        summary: isFullyPaid
          ? `Qarz to‘liq to‘landi va yopildi: ${existing.party_name} (${currentAmount} so‘m)`
          : `Qarz qisman to‘landi: ${existing.party_name} (${paidAmount} so‘m to‘landi, qoldiq: ${newAmount} so‘m)`,
        before_data: existing,
        after_data: updatedEntry,
        created_at: nowStr,
      },
      ...logs,
    ]);

    // 2. Sync to Supabase if available
    if (isSupabaseConfigured() && typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const { data: updated, error: updErr } = await supabase
          .from('entries')
          .update({
            status: newStatus,
            paid_at: isFullyPaid ? nowStr : existing.paid_at,
            amount: newAmount,
            confirmed_by: isFullyPaid ? validAdminId : existing.confirmed_by,
            confirmed_by_name: isFullyPaid ? adminUser.name : existing.confirmed_by_name,
            last_edited_by: validAdminId,
            updated_at: nowStr,
          })
          .eq('id', id)
          .select('*, creator_profile:profiles!created_by(*)')
          .single();

        if (updErr) throw updErr;

        if (updated) {
          // Log in Supabase entry_history & admin_action_log
          await supabase.from('entry_history').insert({
            entry_id: id,
            changed_by: validAdminId,
            changed_by_name: adminUser.name,
            change_type: isFullyPaid ? 'status_changed' : 'edited',
            new_value: { paidAmount, remainingAmount: isFullyPaid ? 0 : newAmount, isFullyPaid, note },
            changes: { amount: { old: currentAmount, new: newAmount }, status: { old: existing.status, new: newStatus } },
          });

          await supabase.from('admin_action_log').insert({
            admin_user_id: validAdminId,
            admin_name: adminUser.name,
            action_type: 'edit',
            target_entry_id: id,
            summary: isFullyPaid
              ? `Qarz to‘liq to‘landi va yopildi: ${existing.party_name} (${currentAmount} so‘m to‘landi)`
              : `Qarz qisman to‘landi: ${existing.party_name} (${paidAmount} so‘m to‘landi, qoldiq: ${newAmount} so‘m)`,
            after_data: updated,
          });

          return {
            updatedEntry: updated as Entry,
            isFullyPaid,
            remainingAmount: isFullyPaid ? 0 : newAmount,
          };
        }
      } catch (err) {
        console.warn('Supabase to‘lov yozishda xatolik, oflayn navbatga olindi:', err);
        syncService.enqueue('pay_entry', {
          id,
          amount: newAmount,
          status: newStatus,
          paid_at: isFullyPaid ? nowStr : existing.paid_at,
          confirmed_by_name: isFullyPaid ? adminUser.name : existing.confirmed_by_name,
        });
      }
    } else if (isSupabaseConfigured()) {
      syncService.enqueue('pay_entry', {
        id,
        amount: newAmount,
        status: newStatus,
        paid_at: isFullyPaid ? nowStr : existing.paid_at,
        confirmed_by_name: isFullyPaid ? adminUser.name : existing.confirmed_by_name,
      });
    }

    return {
      updatedEntry,
      isFullyPaid,
      remainingAmount: isFullyPaid ? 0 : newAmount,
    };
  },


  // ── 8. DASHBOARD METRICS ───────────────────────────────────
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    let items: Entry[] = [];
    let profiles: Profile[] = [];

    if (isSupabaseConfigured()) {
      const { data: entriesData, error: eErr } = await supabase.from('entries').select('*');
      if (eErr) throw eErr;
      items = (entriesData as Entry[]) || [];

      const { data: profData, error: pErr } = await supabase.from('profiles').select('*');
      if (pErr) throw pErr;
      profiles = (profData as Profile[]) || [];
    } else {
      items = getStored<Entry[]>(STORAGE_ENTRIES, INITIAL_MOCK_ENTRIES);
      profiles = getStored<Profile[]>(STORAGE_PROFILES, INITIAL_MOCK_PROFILES);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalOpenCustomer = 0;
    let totalOpenSupplier = 0;
    let overdueCustomer = 0;
    let overdueSupplier = 0;
    let openCount = 0;
    let paidCount = 0;

    let totalPaidDurationDays = 0;
    let paidWithDurationCount = 0;

    items.forEach((entry) => {
      const amt = Number(entry.amount) || 0;
      const isOver = entry.due_date ? new Date(entry.due_date) < today : false;

      if (entry.status === 'open') {
        openCount++;
        if (entry.direction === 'customer') {
          totalOpenCustomer += amt;
          if (isOver) overdueCustomer += amt;
        } else {
          totalOpenSupplier += amt;
          if (isOver) overdueSupplier += amt;
        }
      } else if (entry.status === 'paid') {
        paidCount++;
        if (entry.paid_at && entry.created_at) {
          const createdTime = new Date(entry.created_at).getTime();
          const paidTime = new Date(entry.paid_at).getTime();
          if (paidTime >= createdTime) {
            totalPaidDurationDays += (paidTime - createdTime) / 86400000;
            paidWithDurationCount++;
          }
        }
      }
    });

    const averageTimeToPayment =
      paidWithDurationCount > 0 ? totalPaidDurationDays / paidWithDurationCount : null;

    // Build trend for last 7 periods/days
    const trendMap: Record<string, { newDebtAmount: number; paidAmount: number; entriesCount: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit' });
      trendMap[key] = { newDebtAmount: 0, paidAmount: 0, entriesCount: 0 };
    }

    items.forEach((e) => {
      const entryDate = new Date(e.created_at);
      const key = entryDate.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit' });
      if (trendMap[key]) {
        trendMap[key].newDebtAmount += Number(e.amount);
        trendMap[key].entriesCount++;
      }
      if (e.status === 'paid' && e.paid_at) {
        const paidKey = new Date(e.paid_at).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit' });
        if (trendMap[paidKey]) {
          trendMap[paidKey].paidAmount += Number(e.amount);
        }
      }
    });

    const debtTrend = Object.entries(trendMap).map(([period, val]) => ({
      period,
      ...val,
    }));

    // Worker Activities
    const workerStats: Record<string, { created: number; totalAmt: number; open: number; paid: number; lastActive?: string | null }> = {};
    profiles.forEach((p) => {
      workerStats[p.id] = { created: 0, totalAmt: 0, open: 0, paid: 0, lastActive: null };
    });

    items.forEach((e) => {
      const wid = e.created_by;
      if (wid && workerStats[wid]) {
        workerStats[wid].created++;
        workerStats[wid].totalAmt += Number(e.amount);
        if (e.status === 'open') workerStats[wid].open++;
        if (e.status === 'paid') workerStats[wid].paid++;
        if (!workerStats[wid].lastActive || new Date(e.created_at) > new Date(workerStats[wid].lastActive!)) {
          workerStats[wid].lastActive = e.created_at;
        }
      }
    });

    const workerActivities = profiles.map((p) => ({
      workerId: p.id,
      workerName: p.full_name,
      entriesCreated: workerStats[p.id]?.created || 0,
      totalAmountRecorded: workerStats[p.id]?.totalAmt || 0,
      openCount: workerStats[p.id]?.open || 0,
      paidCount: workerStats[p.id]?.paid || 0,
      lastActiveAt: workerStats[p.id]?.lastActive || null,
    }));

    return {
      totalOpenCustomerDebt: totalOpenCustomer,
      totalOpenSupplierDebt: totalOpenSupplier,
      overdueCustomerDebt: overdueCustomer,
      overdueSupplierDebt: overdueSupplier,
      openEntriesCount: openCount,
      paidEntriesCount: paidCount,
      averageTimeToPaymentDays: averageTimeToPayment,
      debtTrend,
      workerActivities,
    };
  },

  // ── 8. ADMIN ACTION LOGS ────────────────────────────────────
  async getAdminActionLogs(): Promise<AdminActionLog[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('admin_action_log')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as AdminActionLog[]) || [];
    }
    return getStored<AdminActionLog[]>(STORAGE_LOGS, INITIAL_MOCK_ACTION_LOGS);
  },

  // ── 9. CUSTOMERS SUMMARY & REMINDERS ─────────────────────────
  async getCustomerSummaries(
    sortBy: CustomerSortOption = 'highest',
    search = ''
  ): Promise<CustomerSummary[]> {
    let allEntries: Entry[] = [];

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('entries')
        .select('*, creator_profile:profiles!created_by(*)')
        .eq('direction', 'customer');
      if (error) throw error;
      allEntries = (data as Entry[]) || [];
    } else {
      const items = getStored<Entry[]>(STORAGE_ENTRIES, INITIAL_MOCK_ENTRIES);
      allEntries = items.filter((e) => e.direction === 'customer');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const groups: Record<
      string,
      {
        name: string;
        phone: string | null;
        openDebt: number;
        paidDebt: number;
        openCount: number;
        paidCount: number;
        latestDate: string;
        earliestDue: string | null;
        entries: Entry[];
      }
    > = {};

    const profiles = isSupabaseConfigured() ? [] : getStored<Profile[]>(STORAGE_PROFILES, INITIAL_MOCK_PROFILES);

    allEntries.forEach((rawEntry) => {
      const entry: Entry = {
        ...rawEntry,
        creator_profile: profiles.find((p) => p.id === rawEntry.created_by) || rawEntry.creator_profile || null,
        confirmer_profile: profiles.find((p) => p.id === rawEntry.confirmed_by) || rawEntry.confirmer_profile || null,
      };

      const key = entry.party_name.trim().toLowerCase();
      if (!groups[key]) {
        groups[key] = {
          name: entry.party_name.trim(),
          phone: entry.party_phone || null,
          openDebt: 0,
          paidDebt: 0,
          openCount: 0,
          paidCount: 0,
          latestDate: entry.created_at,
          earliestDue: null,
          entries: [],
        };
      }

      const g = groups[key];
      if (entry.party_phone && !g.phone) {
        g.phone = entry.party_phone;
      }

      g.entries.push(entry);

      if (new Date(entry.created_at) > new Date(g.latestDate)) {
        g.latestDate = entry.created_at;
      }

      if (entry.status === 'open') {
        g.openCount++;
        g.openDebt += Number(entry.amount) || 0;

        if (entry.due_date) {
          if (!g.earliestDue || new Date(entry.due_date) < new Date(g.earliestDue)) {
            g.earliestDue = entry.due_date;
          }
        }
      } else if (entry.status === 'paid') {
        g.paidCount++;
        g.paidDebt += Number(entry.amount) || 0;
      }
    });

    let list: CustomerSummary[] = Object.values(groups).map((g) => {
      let isOverdue = false;
      let daysOverdue: number | undefined;
      let daysRemaining: number | undefined;

      if (g.earliestDue) {
        const dueDate = new Date(g.earliestDue);
        dueDate.setHours(0, 0, 0, 0);
        const diffMs = dueDate.getTime() - today.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays < 0 && g.openDebt > 0) {
          isOverdue = true;
          daysOverdue = Math.abs(diffDays);
        } else if (diffDays >= 0) {
          daysRemaining = diffDays;
        }
      }

      return {
        customer_name: g.name,
        customer_phone: g.phone,
        total_debt: g.openDebt,
        total_paid: g.paidDebt,
        open_entries_count: g.openCount,
        paid_entries_count: g.paidCount,
        latest_entry_date: g.latestDate,
        earliest_due_date: g.earliestDue,
        is_overdue: isOverdue,
        days_overdue: daysOverdue,
        days_remaining: daysRemaining,
        entries: g.entries.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
      };
    });

    // Filter by search query if present
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.customer_name.toLowerCase().includes(q) ||
          (c.customer_phone && c.customer_phone.includes(q))
      );
    }

    // Sort by requested option
    if (sortBy === 'highest') {
      list.sort((a, b) => b.total_debt - a.total_debt);
    } else if (sortBy === 'lowest') {
      list.sort((a, b) => a.total_debt - b.total_debt);
    } else if (sortBy === 'recent') {
      list.sort(
        (a, b) => new Date(b.latest_entry_date).getTime() - new Date(a.latest_entry_date).getTime()
      );
    }

    return list;
  },
};
