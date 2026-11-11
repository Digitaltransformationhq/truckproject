import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { fetchNotifications, fetchProfile, fetchWorkspace, type ProfileRow, type Workspace } from '../lib/backend';
import type { AccountRole } from '../components/RoleAuthModal';
import type { AppNotification } from '../types';

/** Current Supabase session and profile. `ready` is false until the first session check completes. */
export function useSession() {
  const [ready, setReady] = useState(!supabase);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const loadProfile = useCallback(async (id: string | null) => {
    setUserId(id);
    if (!id) { setProfile(null); setReady(true); return; }
    try {
      // The profile row is created by a database trigger; retry briefly right after sign-up.
      let row = await fetchProfile(id);
      for (let attempt = 0; !row && attempt < 3; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        row = await fetchProfile(id);
      }
      setProfile(row);
    } catch {
      setProfile(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => loadProfile(data.session?.user.id ?? null));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        // Defer: Supabase recommends not awaiting other client calls inside this callback.
        setTimeout(() => void loadProfile(session?.user.id ?? null), 0);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [loadProfile]);

  const refreshProfile = useCallback(() => loadProfile(userId), [loadProfile, userId]);
  return { ready, userId, profile, refreshProfile };
}

const emptyWorkspace: Workspace = { data: { trucks: [], loads: [] }, drivers: [], tickets: [] };

/** Workspace data for the signed-in user, kept fresh through Supabase Realtime. */
export function useWorkspace(role: AccountRole | null, userId: string | null) {
  const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const reloadTimer = useRef<number | undefined>(undefined);

  const reload = useCallback(async () => {
    if (!supabase || !role || !userId) return;
    try {
      const [next, alerts] = await Promise.all([fetchWorkspace(role, userId), fetchNotifications()]);
      setWorkspace(next);
      setNotifications(alerts);
      setError('');
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Could not load your workspace.');
    } finally {
      setLoading(false);
    }
  }, [role, userId]);

  useEffect(() => {
    if (!supabase || !role || !userId) { setWorkspace(emptyWorkspace); setNotifications([]); return; }
    setLoading(true);
    void reload();
    const scheduleReload = () => { window.clearTimeout(reloadTimer.current); reloadTimer.current = window.setTimeout(() => void reload(), 400); };
    const channel = supabase.channel(`workspace-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loads' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, scheduleReload)
      .subscribe();
    return () => { window.clearTimeout(reloadTimer.current); void supabase?.removeChannel(channel); };
  }, [reload, role, userId]);

  return { workspace, notifications, setNotifications, loading, error, reload };
}
