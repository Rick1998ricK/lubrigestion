import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const url = request.nextUrl.clone()
  url.search = ''

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      url.pathname = '/restablecer'
      return NextResponse.redirect(url)
    }
  }
  url.pathname = '/recuperar'
  url.search = '?error=1'
  return NextResponse.redirect(url)
}