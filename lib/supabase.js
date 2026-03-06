import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function saveDebate({ problem, mode, detailLevel, webSearch, rounds, consensus, followupResponses }) {
  const { data, error } = await supabase
    .from('debates')
    .insert([{
      problem,
      mode,
      detail_level: detailLevel,
      web_search: webSearch,
      rounds,
      consensus,
      followup_responses: followupResponses,
    }])
    .select()
    .single();
  if (error) console.error('Supabase save error:', error);
  return data;
}

export async function loadDebates() {
  const { data, error } = await supabase
    .from('debates')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) console.error('Supabase load error:', error);
  return data || [];
}

export async function loadDebate(id) {
  const { data, error } = await supabase
    .from('debates')
    .select('*')
    .eq('id', id)
    .single();
  if (error) console.error('Supabase load error:', error);
  return data;
}