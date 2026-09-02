import { NextResponse } from 'next/server';
import {
  findUserByUsernameOrEmail,
  createUser,
  verifyPassword,
  createSession,
  validateSession,
  deleteSession,
  initDefaultData,
} from '@/lib/storage';

initDefaultData();

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : null;

    if (!token) {
      return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 });
    }

    const user = validateSession(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    const { passwordHash, salt, ...safeUser } = user;
    return NextResponse.json({ user: safeUser });
  } catch (err: any) {
    console.error('Auth GET Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Authentication verification error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'register') {
      const { username, email, name, password, slackWebhook, telegramToken, telegramChatId, discordWebhook } = body;

      if (!username || !email || !password) {
        return NextResponse.json({ error: 'Username, email, and password are required' }, { status: 400 });
      }

      if (password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
      }

      const existing = findUserByUsernameOrEmail(username) || findUserByUsernameOrEmail(email);
      if (existing) {
        return NextResponse.json({ error: 'User with this username or email already exists' }, { status: 409 });
      }

      const user = createUser({
        username,
        email,
        name: name || username,
        password,
        slackWebhook,
      });

      const token = createSession(user.id);
      const { passwordHash, salt, ...safeUser } = user;

      return NextResponse.json({
        message: 'Registration successful',
        token,
        user: safeUser,
      });
    }

    if (action === 'login') {
      const { identifier, password } = body;
      if (!identifier || !password) {
        return NextResponse.json({ error: 'Identifier and password are required' }, { status: 400 });
      }

      const user = findUserByUsernameOrEmail(identifier);
      if (!user) {
        return NextResponse.json({ error: 'Invalid username/email or password' }, { status: 401 });
      }

      const isValid = verifyPassword(password, user.passwordHash, user.salt);
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid username/email or password' }, { status: 401 });
      }

      const token = createSession(user.id);
      const { passwordHash, salt, ...safeUser } = user;

      return NextResponse.json({
        message: 'Login successful',
        token,
        user: safeUser,
      });
    }

    if (action === 'logout') {
      const authHeader = request.headers.get('authorization');
      const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : null;
      if (token) {
        deleteSession(token);
      }
      return NextResponse.json({ success: true, message: 'Logged out' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('Auth POST Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Authentication processing error' },
      { status: 500 }
    );
  }
}
