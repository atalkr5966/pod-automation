import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/storage';
import { generateOpeningPod, generateClosingPod, analyzeUserPatterns } from '@/lib/analyzer';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : null;

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = validateSession(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    const body = await request.json();
    const { type, customContext } = body;

    if (type !== 'OPENING' && type !== 'CLOSING') {
      return NextResponse.json({ error: 'Type must be OPENING or CLOSING' }, { status: 400 });
    }

    let generatedContent = '';
    if (type === 'OPENING') {
      generatedContent = generateOpeningPod(user, customContext);
    } else {
      generatedContent = generateClosingPod(user, customContext);
    }

    const insights = analyzeUserPatterns(user.pastData || []);

    return NextResponse.json({
      success: true,
      type,
      pod: generatedContent,
      insights,
    });
  } catch (err: any) {
    console.error('Generate POD Error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to generate POD' }, { status: 500 });
  }
}
