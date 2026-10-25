import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db/service';

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { success: false, message: 'Mobile number is required' },
        { status: 400 }
      );
    }

    const result = await dbService.requestPasswordReset(phone);

    return NextResponse.json({
      success: true,
      message: `Verification code sent to ${phone}. (Demo code: ${result.tempCode})`,
      tempCode: result.tempCode,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to process password reset' },
      { status: 500 }
    );
  }
}
