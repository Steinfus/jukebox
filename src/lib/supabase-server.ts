import { createClient } from '@supabase/supabase-js'

// Ce fichier ne doit jamais être importé dans un composant client
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)