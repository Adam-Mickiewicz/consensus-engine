import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createBrowserClient(supabaseUrl, supabaseKey);

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

export async function saveBrandProfile(profile) {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || null;
  // Try to find existing row for this user_id
  const matchCol = userId ? 'user_id' : null;
  const { data: existing } = matchCol
    ? await supabase.from('brand_profiles').select('id').eq('user_id', userId).maybeSingle()
    : await supabase.from('brand_profiles').select('id').is('user_id', null).maybeSingle();

  const payload = { ...profile, user_id: userId, updated_at: new Date().toISOString() };
  if (existing?.id) {
    const { data, error } = await supabase.from('brand_profiles').update(payload).eq('id', existing.id).select().single();
    if (error) console.error('Brand profile update error:', error);
    return data;
  } else {
    const { data, error } = await supabase.from('brand_profiles').insert([payload]).select().single();
    if (error) console.error('Brand profile insert error:', error);
    return data;
  }
}

export async function loadBrandProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = user
    ? await supabase.from('brand_profiles').select('*').eq('user_id', user.id).maybeSingle()
    : await supabase.from('brand_profiles').select('*').is('user_id', null).maybeSingle();
  if (error) console.error('Brand profile load error:', error);
  return data;
}

export async function loadDesignLibrary() {
  const { data, error } = await supabase
    .from('design_library')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) console.error('Supabase design library load error:', error);
  return data || [];
}

export async function updateDesignLibraryItem(id, { title, description, category, product_type, target_audience, style_tags }) {
  const { data, error } = await supabase
    .from('design_library')
    .update({ title, description, category, product_type, target_audience, style_tags })
    .eq('id', id)
    .select()
    .single();
  if (error) console.error('Supabase design library update error:', error);
  return data;
}

export async function deleteDesignLibraryItem(id) {
  const { error } = await supabase.from('design_library').delete().eq('id', id);
  if (error) console.error('Supabase design library delete error:', error);
}
