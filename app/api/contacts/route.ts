import { NextResponse } from 'next/server';
import { convexQuery, convexMutation } from '@/lib/convex-server';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    const userId = session?.userId || '1';
    const contacts = await convexQuery('contacts:getContacts', { userId });

    return NextResponse.json({ success: true, contacts });
  } catch (error) {
    return NextResponse.json({ success: true, contacts: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const userId = session?.userId || '1';
    const body = await request.json();

    if (!body.name || !body.phone) {
      return NextResponse.json(
        { success: false, message: 'Name and phone are required' },
        { status: 400 }
      );
    }

    const contactId = await convexMutation('contacts:createContact', {
      userId,
      name: body.name,
      phone: body.phone,
      relationship: body.relationship || 'Friend',
      isPrimary: Boolean(body.is_primary),
      photoUrl: body.photo_url,
    });

    return NextResponse.json({
      success: true,
      message: 'Contact added successfully',
      contact: { id: contactId, ...body },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Invalid contact payload' },
      { status: 400 }
    );
  }
}
