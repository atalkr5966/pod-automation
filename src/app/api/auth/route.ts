import { NextResponse } from 'next/server';
import { dbService } from '@/server/db';
import {
  hashPassword,
  verifyPassword,
  signToken,
  getSessionUser,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
  toSafeUser,
} from '@/server/auth';

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized or session expired' }, { status: 401 });
    }

    const workspace = await dbService.getOrCreateWorkspace();
    const slackConn = await dbService.getSlackConnection(user.workspaceId);

    return NextResponse.json({
      user,
      workspace,
      slackConnected: slackConn?.status === 'CONNECTED',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Auth GET Error:', msg);
    return NextResponse.json({ error: 'Authentication verification failure' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;
    const clientIp = request.headers.get('x-forwarded-for') || 'local';

    if (action === 'register') {
      const { username, email, name, password } = body;

      if (!username || !email || !password) {
        return NextResponse.json(
          { error: 'Username, email, and password are required' },
          { status: 400 }
        );
      }

      if (password.length < 6) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters long' },
          { status: 400 }
        );
      }

      const existing =
        (await dbService.findUserByEmailOrUsername(username)) ||
        (await dbService.findUserByEmailOrUsername(email));

      if (existing) {
        return NextResponse.json(
          { error: 'An account with this username or email already exists' },
          { status: 409 }
        );
      }

      const workspace = await dbService.getOrCreateWorkspace();
      const { hash, salt } = hashPassword(password);

      const newUser = await dbService.createUser({
        workspaceId: workspace.id,
        username,
        email,
        name: name || username,
        passwordHash: hash,
        salt,
        role: 'admin',
      });

      const token = signToken({
        userId: newUser.id,
        workspaceId: newUser.workspaceId,
        username: newUser.username,
        email: newUser.email,
      });

      const response = NextResponse.json({
        message: 'Account created successfully',
        token,
        user: toSafeUser(newUser),
        workspace,
      });

      response.cookies.set('pod_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 86400,
      });

      return response;
    }

    if (action === 'login') {
      const { identifier, password } = body;

      if (!identifier || !password) {
        return NextResponse.json(
          { error: 'Identifier and password are required' },
          { status: 400 }
        );
      }

      const rateCheck = checkRateLimit(clientIp);
      if (!rateCheck.allowed) {
        return NextResponse.json(
          {
            error: `Too many failed login attempts. Please wait ${rateCheck.waitSeconds} seconds before trying again.`,
          },
          { status: 429 }
        );
      }

      const user = await dbService.findUserByEmailOrUsername(identifier);
      if (!user) {
        recordFailedAttempt(clientIp);
        return NextResponse.json(
          { error: 'Invalid username/email or password' },
          { status: 401 }
        );
      }

      const isValid = verifyPassword(password, user.passwordHash, user.salt);
      if (!isValid) {
        recordFailedAttempt(clientIp);
        return NextResponse.json(
          { error: 'Invalid username/email or password' },
          { status: 401 }
        );
      }

      resetRateLimit(clientIp);

      const workspace = await dbService.getOrCreateWorkspace();
      const token = signToken({
        userId: user.id,
        workspaceId: user.workspaceId,
        username: user.username,
        email: user.email,
      });

      const response = NextResponse.json({
        message: 'Signed in successfully',
        token,
        user: toSafeUser(user),
        workspace,
      });

      response.cookies.set('pod_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 86400,
      });

      return response;
    }

    if (action === 'logout') {
      const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
      response.cookies.delete('pod_session');
      return response;
    }

    return NextResponse.json({ error: 'Invalid auth action' }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Auth POST Error:', msg);
    return NextResponse.json({ error: 'Authentication processing failure', details: msg }, { status: 500 });
  }
}
