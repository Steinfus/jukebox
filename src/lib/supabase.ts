import { createClient } from '@supabase/supabase-js'

// Client public (côté navigateur ou API routes sans droits admin)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)