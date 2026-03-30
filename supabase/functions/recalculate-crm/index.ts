import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  await supabase.rpc('recalculate_all_ltv')
  await supabase.rpc('refresh_crm_views')

  // Fire and forget — nie czekamy na zakończenie przeliczania taksonomii
  fetch('https://consensus-engine-chi.vercel.app/api/admin/recalculate-taxonomy', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + Deno.env.get('CRON_SECRET') },
  }).catch(() => {})

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
