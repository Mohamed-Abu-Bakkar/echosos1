import { NextResponse } from 'next/server';
import { convexMutation } from '@/lib/convex-server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updated = await convexMutation('contacts:updateContact', {
      contactId: id,
      name: body.name,
      phone: body.phone,
      relationship: body.relationship,
      isPrimary: body.is_primary,
      photoUrl: body.photo_url,
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, message: 'Contact not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Contact updated successfully',
      contact: updated,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to update contact' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await convexMutation('contacts:deleteContact', { contactId: id });

    if (!deleted) {
      return NextResponse.json(
        { success: false, message: 'Contact not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Contact deleted successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to delete contact' },
      { status: 500 }
    );
  }
}
