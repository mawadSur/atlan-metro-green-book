import { NextRequest, NextResponse } from 'next/server';
import { getSmartInstallUrl } from '@/lib/smartRoute';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  const userAgent = request.headers.get('user-agent');
  const destination = getSmartInstallUrl(request.url, userAgent);

  return NextResponse.redirect(destination, 307);
}
