import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'No env' })

  const supabase = createClient(url, key)
  const { data, error } = await supabase.from('turnos').select('*').limit(1)

  return NextResponse.json({ data, error })
}
