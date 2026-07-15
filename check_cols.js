import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://mrnypajnlltkuitfzgkh.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ybnlwYWpubGx0a3VpdGZ6Z2toIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNzk2NDcsImV4cCI6MjA4MTk1NTY0N30.4kuCn5DIuZ_WHDnP66K7MxOkGunkMn_WXmuRf8g9yr8');
async function run() {
  const { data, error } = await supabase.from('bookings').select('*').limit(1);
  console.log(error || (data && data.length ? Object.keys(data[0]) : "Empty bookings"));
}
run();
