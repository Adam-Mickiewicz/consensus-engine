const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function clean() {
  await supabase.from('client_product_events').delete().neq('id', 0)
  await supabase.from('clients_360').delete().neq('client_id', '')
  await supabase.from('master_key').delete().neq('client_id', '')
  await supabase.rpc('refresh_crm_views')
  console.log('Baza wyczyszczona')
}
clean()
