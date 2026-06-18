import { supabase } from './supabaseClient';

// Fallback Local Storage functions
const getLocalBookmarks = (userId: string): { targetId: string; targetType: 'worker' | 'job' }[] => {
  try {
    const data = localStorage.getItem(`velgo_bookmarks_${userId}`);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error parsing local bookmarks', e);
    return [];
  }
};

const saveLocalBookmarks = (userId: string, bookmarks: { targetId: string; targetType: 'worker' | 'job' }[]) => {
  try {
    localStorage.setItem(`velgo_bookmarks_${userId}`, JSON.stringify(bookmarks));
  } catch (e) {
    console.error('Error saving local bookmarks', e);
  }
};

/**
 * Checks if a target (worker or job offer) is bookmarked by the user.
 */
export async function isBookmarked(
  userId: string,
  targetId: string,
  targetType: 'worker' | 'job'
): Promise<boolean> {
  if (!userId || !targetId) return false;

  try {
    const { data, error } = await supabase
      .from('velgo_bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('target_id', targetId)
      .eq('target_type', targetType)
      .maybeSingle();

    if (error) throw error;
    return !!data;
  } catch (err: any) {
    // If table does not exist or fetch fails, fallback to local storage
    const local = getLocalBookmarks(userId);
    return local.some((b) => b.targetId === targetId && b.targetType === targetType);
  }
}

/**
 * Toggles a bookmark. Returns true if bookmarked, false if removed.
 */
export async function toggleBookmark(
  userId: string,
  targetId: string,
  targetType: 'worker' | 'job'
): Promise<boolean> {
  if (!userId || !targetId) return false;

  let isNowBookmarked = false;
  let useFallback = false;

  try {
    const { data: existing, error: checkError } = await supabase
      .from('velgo_bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('target_id', targetId)
      .eq('target_type', targetType)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existing) {
      const { error: deleteError } = await supabase
        .from('velgo_bookmarks')
        .delete()
        .eq('id', existing.id);

      if (deleteError) throw deleteError;
      isNowBookmarked = false;
    } else {
      const { error: insertError } = await supabase
        .from('velgo_bookmarks')
        .insert([{ user_id: userId, target_id: targetId, target_type: targetType }]);

      if (insertError) throw insertError;
      isNowBookmarked = true;
    }

    // Since database succeeded, let's also sync local storage just in case offline view is needed later
    const local = getLocalBookmarks(userId);
    const filtered = local.filter((b) => !(b.targetId === targetId && b.targetType === targetType));
    if (isNowBookmarked) {
      filtered.push({ targetId, targetType });
    }
    saveLocalBookmarks(userId, filtered);

  } catch (err: any) {
    useFallback = true;
  }

  if (useFallback) {
    const local = getLocalBookmarks(userId);
    const exists = local.some((b) => b.targetId === targetId && b.targetType === targetType);

    let updatedList;
    if (exists) {
      updatedList = local.filter((b) => !(b.targetId === targetId && b.targetType === targetType));
      isNowBookmarked = false;
    } else {
      updatedList = [...local, { targetId, targetType }];
      isNowBookmarked = true;
    }
    saveLocalBookmarks(userId, updatedList);
  }

  return isNowBookmarked;
}

/**
 * Gets all bookmarked IDs for a given user and target type.
 */
export async function getBookmarkedIds(
  userId: string,
  targetType?: 'worker' | 'job'
): Promise<string[]> {
  if (!userId) return [];

  try {
    let query = supabase
      .from('velgo_bookmarks')
      .select('target_id, target_type')
      .eq('user_id', userId);

    if (targetType) {
      query = query.eq('target_type', targetType);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data.map((b) => b.target_id);
  } catch (err) {
    // Fallback to local storage query
    const local = getLocalBookmarks(userId);
    const filtered = targetType ? local.filter((b) => b.targetType === targetType) : local;
    return filtered.map((b) => b.targetId);
  }
}
