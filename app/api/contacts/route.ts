import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db/service';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  const userId = session?.userId || 1;
  const contacts = await dbService.getContacts(userId);

  return NextResponse.json({
    success: true,
    contacts,
  });
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const userId = session?.userId || 1;
    const body = await request.json();

    if (!body.name || !body.phone) {
      return NextResponse.json(
        { success: false, message: 'Name and phone are required' },
        { status: 400 }
      );
    }

    const contact = await dbService.createContact(userId, {
      name: body.name,
      phone: body.phone,
      relationship: body.relationship || 'Friend',
      is_primary: Boolean(body.is_primary),
      photo_url: body.photo_url,
    });

    return NextResponse.json({
      success: true,
      message: 'Contact added successfully',
      contact,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Invalid contact payload' },
      { status: 400 }
    );
  }
}
