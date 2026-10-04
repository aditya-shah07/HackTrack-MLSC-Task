/**
 * HackTrack Data Store
 * Handles all Supabase operations with real-time subscriptions
 */
import { supabase, isSupabaseReady } from './supabase.js';
import { generateCode, getDeviceId } from './utils.js';

// Real-time subscription channels
let hackathonChannel = null;

/**
 * ==============================
 *  HACKATHON CRUD
 * ==============================
 */

/**
 * Create a new hackathon
 */
export async function createHackathon(name, totalRounds = 3) {
  if (!isSupabaseReady()) throw new Error('Supabase not configured');

  const joinCode = generateCode(6);

  const { data, error } = await supabase
    .from('hackathons')
    .insert({
      name,
      join_code: joinCode,
      total_rounds: totalRounds,
      current_round: 1,
      status: 'active',
      created_by: getDeviceId(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get hackathon by join code
 */
export async function getHackathonByCode(code) {
  if (!isSupabaseReady()) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('hackathons')
    .select('*')
    .eq('join_code', code.toUpperCase())
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get hackathon by ID
 */
export async function getHackathon(id) {
  if (!isSupabaseReady()) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('hackathons')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update hackathon (round, status)
 */
export async function updateHackathon(id, updates) {
  if (!isSupabaseReady()) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('hackathons')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * ==============================
 *  TEAM CRUD
 * ==============================
 */

/**
 * Register a team for a hackathon
 */
export async function registerTeam(hackathonId, name, tableNumber) {
  if (!isSupabaseReady()) throw new Error('Supabase not configured');

  // Get current count for eval_position
  const { count } = await supabase
    .from('teams')
    .select('*', { count: 'exact', head: true })
    .eq('hackathon_id', hackathonId);

  const { data, error } = await supabase
    .from('teams')
    .insert({
      hackathon_id: hackathonId,
      name,
      table_number: tableNumber || null,
      status: 'waiting',
      eval_position: (count || 0) + 1,
      device_id: getDeviceId(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all teams for a hackathon
 */
export async function getTeams(hackathonId) {
  if (!isSupabaseReady()) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('hackathon_id', hackathonId)
    .order('eval_position', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Update a team's status
 */
export async function updateTeamStatus(teamId, status) {
  if (!isSupabaseReady()) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('teams')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', teamId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update team eval position
 */
export async function updateTeamPosition(teamId, position) {
  if (!isSupabaseReady()) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('teams')
    .update({ eval_position: position })
    .eq('id', teamId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Submit evaluation scores for a team and mark as evaluated
 */
export async function submitEvaluation(teamId, scores) {
  if (!isSupabaseReady()) throw new Error('Supabase not configured');

  const { error } = await supabase
    .from('teams')
    .update({
      score_innovation: scores.innovation,
      score_accuracy: scores.accuracy,
      score_ui: scores.ui,
      score_privacy: scores.privacy,
      score_community: scores.community,
      score_total: scores.total,
      eval_notes: scores.notes || '',
      status: 'evaluated',
      updated_at: new Date().toISOString()
    })
    .eq('id', teamId);

  if (error) throw error;
  return true;
}

/**
 * Mark multiple teams as eliminated
 */
export async function eliminateTeams(teamIds) {
  if (!isSupabaseReady()) throw new Error('Supabase not configured');
  
  if (teamIds.length === 0) return true;

  const { error } = await supabase
    .from('teams')
    .update({ is_eliminated: true, updated_at: new Date().toISOString() })
    .in('id', teamIds);

  if (error) throw error;
  return true;
}

/**
 * Get user's team by device ID
 */
export async function getMyTeam(hackathonId) {
  if (!isSupabaseReady()) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('hackathon_id', hackathonId)
    .eq('device_id', getDeviceId())
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * ==============================
 *  ANNOUNCEMENTS
 * ==============================
 */

/**
 * Create an announcement
 */
export async function createAnnouncement(hackathonId, message, priority = 'normal') {
  if (!isSupabaseReady()) throw new Error('Supabase not configured');

  const { error } = await supabase
    .from('announcements')
    .insert({
      hackathon_id: hackathonId,
      message,
      priority,
    });

  if (error) throw error;
  return true;
}

/**
 * Delete an announcement
 */
export async function deleteAnnouncement(announcementId) {
  if (!isSupabaseReady()) throw new Error('Supabase not configured');

  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', announcementId);

  if (error) throw error;
  return true;
}

/**
 * Get announcements for a hackathon
 */
export async function getAnnouncements(hackathonId) {
  if (!isSupabaseReady()) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('hackathon_id', hackathonId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data || [];
}

/**
 * ==============================
 *  REAL-TIME SUBSCRIPTIONS
 * ==============================
 */

/**
 * Subscribe to real-time changes for a hackathon
 * @param {string} hackathonId
 * @param {Object} callbacks - { onTeamChange, onAnnouncement, onHackathonChange }
 */
export function subscribeToHackathon(hackathonId, callbacks) {
  if (!isSupabaseReady()) return null;

  // Unsubscribe from previous
  unsubscribeAll();

  hackathonChannel = supabase
    .channel(`hackathon-${hackathonId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'teams',
        filter: `hackathon_id=eq.${hackathonId}`,
      },
      (payload) => {
        if (callbacks.onTeamChange) callbacks.onTeamChange(payload);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'announcements',
        filter: `hackathon_id=eq.${hackathonId}`,
      },
      (payload) => {
        if (callbacks.onAnnouncement) callbacks.onAnnouncement(payload);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'hackathons',
        filter: `id=eq.${hackathonId}`,
      },
      (payload) => {
        if (callbacks.onHackathonChange) callbacks.onHackathonChange(payload);
      }
    )
    .subscribe();

  return hackathonChannel;
}

/**
 * Unsubscribe from all channels
 */
export function unsubscribeAll() {
  if (hackathonChannel) {
    supabase.removeChannel(hackathonChannel);
    hackathonChannel = null;
  }
}
