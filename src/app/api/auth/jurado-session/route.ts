import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const verified = cookieStore.get('jurado_verified')?.value === 'true';
  const juradoId = cookieStore.get('jurado_id')?.value;
  const juradoName = cookieStore.get('jurado_name')?.value;

  if (!verified || !juradoId || !juradoName) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    jurado: { id: juradoId, name: decodeURIComponent(juradoName) }
  });
}
