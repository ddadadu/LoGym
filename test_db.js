import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase
    .from('community_feeds')
    .select(`
      id,
      workout_logs(
        id,
        workout_log_items(
          sets,
          equipments(name),
          user_custom_exercises(name)
        )
      )
    `)
    .limit(1);

  console.log("Error:", error);
  console.log("Data:", JSON.stringify(data, null, 2));
}

check();
