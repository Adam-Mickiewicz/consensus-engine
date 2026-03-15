import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function saveDebate({ problem, mode, detailLevel, webSearch, rounds, consensus, followupResponses }) {
  const { data: { user } } = await supabase.auth.getUser();
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
      user_id: user?.id || null,
    }])
    .select()
    .single();
  if (error) console.error('Supabase save error:', error);
  return data;
}

export async function updateDebate(id, { rounds, consensus, followupResponses }) {
  const { data, error } = await supabase
    .from('debates')
    .update({
      rounds,
      consensus,
      followup_responses: followupResponses,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) console.error('Supabase update error:', error);
  return data;
}

export async function loadDebates() {
  const { data: { user } } = await supabase.auth.getUser();
  let query = supabase.from('debates').select('*').order('created_at', { ascending: false }).limit(50);
  if (user) query = query.eq('user_id', user.id);
  else query = query.is('user_id', null);
  const { data, error } = await query;
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

export async function saveDesignReview({ imageBase64, imageName, brief, verdict }) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('design_reviews')
    .insert([{
      user_id: user?.id || null,
      image_base64: imageBase64,
      image_name: imageName,
      brief,
      verdict,
    }])
    .select()
    .single();
  if (error) console.error('Supabase design save error:', error);
  return data;
}

export async function loadDesignReviews() {
  const { data: { user } } = await supabase.auth.getUser();
  let query = supabase
    .from('design_reviews')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (user) query = query.eq('user_id', user.id);
  else query = query.is('user_id', null);
  const { data, error } = await query;
  if (error) console.error('Supabase design load error:', error);
  return data || [];
}

export async function deleteDesignReview(id) {
  const { error } = await supabase.from('design_reviews').delete().eq('id', id);
  if (error) console.error('Supabase design delete error:', error);
}

export async function saveConversation({ id, title, messages, settings }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (id) {
    const { data, error } = await supabase
      .from('conversations')
      .update({ title, messages, settings, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) console.error('Supabase conversation update error:', error);
    return data;
  } else {
    const { data, error } = await supabase
      .from('conversations')
      .insert([{ user_id: user?.id || null, title, messages, settings }])
      .select()
      .single();
    if (error) console.error('Supabase conversation insert error:', error);
    return data;
  }
}

export async function loadConversations() {
  const { data: { user } } = await supabase.auth.getUser();
  let query = supabase
    .from('conversations')
    .select('id, title, created_at, updated_at, messages')
    .order('updated_at', { ascending: false })
    .limit(50);
  if (user) query = query.eq('user_id', user.id);
  else query = query.is('user_id', null);
  const { data, error } = await query;
  if (error) console.error('Supabase conversations load error:', error);
  return data || [];
}

export async function loadConversation(id) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', id)
    .single();
  if (error) console.error('Supabase conversation load error:', error);
  return data;
}

export async function deleteConversation(id) {
  const { error } = await supabase.from('conversations').delete().eq('id', id);
  if (error) console.error('Supabase conversation delete error:', error);
}
