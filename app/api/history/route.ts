import { NextResponse } from 'next/server';
import { convexQuery } from '@/lib/convex-server';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || undefined;
    const session = await getSession();
    const userId = session?.userId || '1';
    const history = await convexQuery('alerts:getAlertHistory', { userId, filter });

    return NextResponse.json({
      success: true,
      count: history.length,
      totalRecords: history.length,
      history,
    });
  } catch (error) {
    return NextResponse.json({ success: true, count: 0, totalRecords: 0, history: [] });
  }
}
