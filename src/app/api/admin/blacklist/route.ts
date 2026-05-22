import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

// Récupère la blacklist
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('blacklist')
      .select('*')
      .order('artist_name', { ascending: true })

    if (error) throw error
    return NextResponse.json({ blacklist: data })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// Ajoute un artiste à la blacklist
export async function POST(request: NextRequest) {
  try {
    const { artist_name } = await request.json()

    const { error } = await supabaseAdmin
      .from('blacklist')
      .insert({ artist_name })

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Artiste déjà bloqué' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// Retire un artiste de la blacklist
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json()

    const { error } = await supabaseAdmin
      .from('blacklist')
      .delete()
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}