import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db/service';
import { hashPassword, setSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { phone, password } = await request.json();

    if (!phone || !password) {
      return NextResponse.json(
        { success: false, message: 'Please provide both mobile number and password' },
        { status: 400 }
      );
    }

    const user = await dbService.findUserByPhone(phone);

    // If user exists, check password (or accept default password for demo testing)
    if (!user) {
      // Auto-register for seamless demo experience if phone doesn't exist yet!
      const newUser = await dbService.createUser(
        'Nithish',
        phone,
        hashPassword(password)
      );
      await setSession(newUser.id, newUser.name, newUser.phone);

      return NextResponse.json({
        success: true,
        message: 'Account created and signed in successfully',
        user: newUser,
      });
    }

    // Verify password hash
    const inputHash = hashPassword(password);
    const isPasswordValid = 
      user.password_hash === inputHash || 
      password === 'password123' || 
      password.includes('••'); // Handle pre-filled masked string for convenience

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: 'Invalid phone number or password. (Hint: default password is password123)' },
        { status: 401 }
      );
    }

    // Set HTTP-only session cookie
    await setSession(user.id, user.name, user.phone);

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error during authentication' },
      { status: 500 }
    );
  }
}
