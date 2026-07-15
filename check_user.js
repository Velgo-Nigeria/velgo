import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mrnypajnlltkuitfzgkh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ybnlwYWpubGx0a3VpdGZ6Z2toIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNzk2NDcsImV4cCI6MjA4MTk1NTY0N30.4kuCn5DIuZ_WHDnP66K7MxOkGunkMn_WXmuRf8g9yr8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);
async function run() {
  const { data, error } = await supabase.from('profiles').select('*').eq('email', 'velgonigeria.uni@gmail.com');
  console.log(error ? error : JSON.stringify(data, null, 2));
}
run();
