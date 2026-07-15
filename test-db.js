import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('bookings').select('decline_reason').limit(1);
  if (error) {
    console.error("Error:", error.message);
  } else {
    console.log("Column exists!", data);
  }
}
check();
