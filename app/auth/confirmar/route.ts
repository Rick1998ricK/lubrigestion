import type { EmailOtpType } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams
  const token_hash = q.get('token_hash')
  const type = q.get('type') as EmailOtpType | null
  const url = request.nextUrl.clone()
  url.search = ''

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      url.pathname = '/restablecer'
      return NextResponse.redirect(url)
    }
  }
  url.pathname = '/recuperar'
  url.search = '?error=1'
  return NextResponse.redirect(url)
}