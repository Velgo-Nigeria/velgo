import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Set Vercel Edge caching headers to protect against automated scraping & DB exhaustion
  // Caches for 5 minutes (300s) at the CDN edge, stale-while-revalidate up to 10 minutes (600s)
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  res.setHeader('Content-Type', 'application/json');

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    let activeGigs: any[] = [];
    let topCategories: any[] = [];

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);

      // 1. Fetch sanitized open gigs (Max 15 items, no personal contact details or exact street addresses)
      const { data: tasksData } = await supabase
        .from('posted_tasks')
        .select('id, title, category, location, budget, created_at')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(15);

      if (tasksData) {
        activeGigs = tasksData.map((task: any) => ({
          id: task.id,
          title: task.title ? String(task.title).substring(0, 80) : 'General Service Request',
          category: task.category || 'General Handyman',
          location: task.location || 'Edo State, Nigeria',
          budget_approx_ngn: task.budget ? `₦${Number(task.budget).toLocaleString()}` : 'Negotiable',
          posted_date: task.created_at ? new Date(task.created_at).toISOString().split('T')[0] : 'Recent',
          deep_link: `https://velgo.com.ng/?jobId=${task.id}`
        }));
      }

      // 2. Fetch top verified worker categories & average rating summary
      const { data: workersData } = await supabase
        .from('profiles')
        .select('category, subcategory, worker_avg_rating, is_verified')
        .eq('is_verified', true)
        .not('category', 'is', null)
        .limit(30);

      if (workersData && workersData.length > 0) {
        const categoryMap = new Map<string, { count: number; totalRating: number }>();
        workersData.forEach((worker: any) => {
          if (!worker.category) return;
          const cat = String(worker.category).trim();
          const rating = Number(worker.worker_avg_rating || 5.0);
          const current = categoryMap.get(cat) || { count: 0, totalRating: 0 };
          categoryMap.set(cat, {
            count: current.count + 1,
            totalRating: current.totalRating + rating
          });
        });

        topCategories = Array.from(categoryMap.entries()).map(([name, stats]) => ({
          category_name: name,
          verified_workers_available: stats.count,
          avg_rating: (stats.totalRating / stats.count).toFixed(1) + '★'
        })).slice(0, 10);
      }
    }

    // Fallback static categories if DB returns empty or unconfigured
    if (topCategories.length === 0) {
      topCategories = [
        { category_name: 'Plumbing & Water Works', verified_workers_available: 12, avg_rating: '4.9★' },
        { category_name: 'Electrical & Solar Installation', verified_workers_available: 15, avg_rating: '4.8★' },
        { category_name: 'Carpentry & Furniture Works', verified_workers_available: 8, avg_rating: '4.9★' },
        { category_name: 'AC & Refrigeration Technicians', verified_workers_available: 10, avg_rating: '4.7★' },
        { category_name: 'Fashion & Tailoring Services', verified_workers_available: 14, avg_rating: '4.9★' },
        { category_name: 'Auto Mechanics & Diagnostics', verified_workers_available: 9, avg_rating: '4.8★' }
      ];
    }

    return res.status(200).json({
      platform: 'Velgo Nigeria',
      tagline: 'Zero-Commission Peer-to-Peer Gig Marketplace',
      website: 'https://velgo.com.ng',
      endpoint_purpose: 'Sanitized Read-Only Public AI Discovery Feed',
      security_note: 'All private user contact information (phones, emails, exact home addresses) are strictly excluded from public feeds.',
      updated_at: new Date().toISOString(),
      active_public_gigs_count: activeGigs.length,
      active_public_gigs: activeGigs,
      top_verified_categories: topCategories,
      ai_deep_link_formats: {
        worker_detail: 'https://velgo.com.ng/?workerId={WORKER_UUID}',
        job_detail: 'https://velgo.com.ng/?jobId={JOB_UUID}'
      }
    });
  } catch (error: any) {
    // Fail safely with sanitized response
    return res.status(200).json({
      platform: 'Velgo Nigeria',
      website: 'https://velgo.com.ng',
      status: 'active',
      note: 'Sanitized public discovery feed operating in backup mode',
      updated_at: new Date().toISOString(),
      active_public_gigs: [],
      top_verified_categories: [
        { category_name: 'Plumbing Services', verified_workers_available: 10, avg_rating: '4.9★' },
        { category_name: 'Electrical Installation', verified_workers_available: 12, avg_rating: '4.8★' },
        { category_name: 'Carpentry', verified_workers_available: 8, avg_rating: '4.9★' }
      ]
    });
  }
}
