import { supabase } from './supabaseClient';
import { AppRating } from '../types';

const STORAGE_KEY = 'velgo_app_ratings_v1';

// Pre-seeded default featured ratings so community section is vibrant out of the box
const DEFAULT_APP_RATINGS: AppRating[] = [
  {
    id: 'seed-1',
    user_name: 'Ose Architecture',
    user_role: 'Client',
    rating: 5,
    comment: "Velgo has changed how I hire professionals. The zero-commission model means my money goes straight to the worker's family.",
    category: 'Gigs & Payments',
    is_featured: true,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString()
  },
  {
    id: 'seed-2',
    user_name: 'Moriah Indo',
    user_role: 'Worker',
    rating: 5,
    comment: "The best platform for Nigerian professionals to scale their business effortlessly. I got 3 bookings in my first week!",
    category: 'Usability',
    is_featured: true,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: 'seed-3',
    user_name: 'Tega Design',
    user_role: 'Worker',
    rating: 5,
    comment: "Seamless payments and great interface. Highly recommended for every entrepreneur in Edo State.",
    category: 'General Feedback',
    is_featured: true,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString()
  }
];

function getLocalRatings(): AppRating[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_APP_RATINGS));
      return DEFAULT_APP_RATINGS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_APP_RATINGS;
  }
}

function saveLocalRatings(ratings: AppRating[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ratings));
  } catch (e) {
    console.error("Failed to write to localStorage for app ratings:", e);
  }
}

export async function fetchAllAppRatings(): Promise<AppRating[]> {
  const local = getLocalRatings();
  try {
    const { data, error } = await supabase
      .from('app_ratings')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      if (data.length === 0) {
        // Table exists in Supabase but is empty. Auto-seed DEFAULT_APP_RATINGS to Supabase
        try {
          await supabase.from('app_ratings').insert(
            DEFAULT_APP_RATINGS.map(r => ({
              id: r.id,
              user_id: r.user_id,
              user_name: r.user_name,
              user_role: r.user_role,
              rating: r.rating,
              comment: r.comment,
              category: r.category,
              is_featured: r.is_featured,
              created_at: r.created_at
            }))
          );
        } catch (seedErr) {
          console.warn("Auto-seed default app ratings to Supabase notice:", seedErr);
        }
        return DEFAULT_APP_RATINGS;
      }

      // Merge remote data with local items to ensure offline submissions are preserved,
      // excluding seed ratings if remote data exists (so deleted seed ratings don't resurrect).
      const remoteIds = new Set(data.map(d => d.id));
      const unsyncedLocal = local.filter(l => !remoteIds.has(l.id) && !l.id.startsWith('seed-'));
      const combined = [...data, ...unsyncedLocal].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      saveLocalRatings(combined);
      return combined;
    }
  } catch (err) {
    console.warn("Supabase fetch app_ratings error, falling back to local storage:", err);
  }
  return local;
}

export async function submitAppRating(input: {
  user_id?: string;
  user_name: string;
  user_role?: string;
  rating: number;
  comment: string;
  category?: string;
}): Promise<AppRating> {
  const newRating: AppRating = {
    id: `ar-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    user_id: input.user_id || undefined,
    user_name: input.user_name.trim() || 'Guest User',
    user_role: input.user_role || 'Guest',
    rating: input.rating,
    comment: input.comment.trim(),
    category: input.category || 'General Feedback',
    is_featured: false,
    created_at: new Date().toISOString(),
  };

  // Try saving to Supabase
  try {
    const { data, error } = await supabase
      .from('app_ratings')
      .insert([
        {
          id: newRating.id,
          user_id: newRating.user_id,
          user_name: newRating.user_name,
          user_role: newRating.user_role,
          rating: newRating.rating,
          comment: newRating.comment,
          category: newRating.category,
          is_featured: false,
          created_at: newRating.created_at,
        }
      ])
      .select()
      .single();

    if (!error && data) {
      const local = getLocalRatings();
      saveLocalRatings([data, ...local]);
      return data;
    }
  } catch (e) {
    console.warn("Supabase insert app_ratings error, relying on local storage fallback:", e);
  }

  // Fallback to local storage
  const local = getLocalRatings();
  const updated = [newRating, ...local];
  saveLocalRatings(updated);
  return newRating;
}

export async function toggleFeaturedAppRating(ratingId: string, isFeatured: boolean): Promise<boolean> {
  const local = getLocalRatings();
  const updated = local.map(r => r.id === ratingId ? { ...r, is_featured: isFeatured } : r);
  saveLocalRatings(updated);

  try {
    await supabase
      .from('app_ratings')
      .update({ is_featured: isFeatured })
      .eq('id', ratingId);
  } catch (e) {
    console.warn("Supabase update is_featured error:", e);
  }

  return true;
}

export async function replyAppRating(ratingId: string, replyText: string): Promise<boolean> {
  const now = new Date().toISOString();
  const local = getLocalRatings();
  const updated = local.map(r => r.id === ratingId ? { ...r, admin_reply: replyText, admin_replied_at: now } : r);
  saveLocalRatings(updated);

  try {
    await supabase
      .from('app_ratings')
      .update({ admin_reply: replyText, admin_replied_at: now })
      .eq('id', ratingId);
  } catch (e) {
    console.warn("Supabase update admin_reply error:", e);
  }

  return true;
}

export async function deleteAppRating(ratingId: string): Promise<boolean> {
  const local = getLocalRatings();
  const updated = local.filter(r => r.id !== ratingId);
  saveLocalRatings(updated);

  try {
    await supabase
      .from('app_ratings')
      .delete()
      .eq('id', ratingId);
  } catch (e) {
    console.warn("Supabase delete app_ratings error:", e);
  }

  return true;
}
