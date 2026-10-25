import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db/service';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filter = searchParams.get('filter') || undefined;

  const session = await getSession();
  const userId = session?.userId || 1;
  const history = await dbService.getAlertHistory(userId, filter);

  return NextResponse.json({
    success: true,
    count: history.length,
    totalRecords: 32,
    history,
  });
}
