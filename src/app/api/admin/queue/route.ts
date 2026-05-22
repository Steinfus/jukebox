import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

// Modifie le statut ou les votes d'une chanson
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status, votes } = body

    const updates: Record<string, unknown> = {}
    if (status !== undefined) updates.status = status
    if (votes !== undefined) updates.votes = votes

    const { error } = await supabaseAdmin
      .from('queue')
      .update(updates)
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur modification file:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// Reset complet de la file
export async function DELETE() {
  try {
    const { error } = await supabaseAdmin
      .from('queue')
      .update({ status: 'played' })
      .eq('status', 'pending')

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur reset file:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}