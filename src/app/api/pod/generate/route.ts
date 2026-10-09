import { NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { dbService } from '@/server/db';
import { generateOpeningPod, generateClosingPod, analyzeUserPatterns } from '@/lib/analyzer';

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { type = 'OPENING', customContext } = body;

    if (type !== 'OPENING' && type !== 'CLOSING') {
      return NextResponse.json({ error: 'Type must be OPENING or CLOSING' }, { status: 400 });
    }

    const pastData = await dbService.getPastData(user.workspaceId);

    const generatedContent =
      type === 'OPENING'
        ? generateOpeningPod(pastData, customContext)
        : generateClosingPod(pastData, customContext);

    const insights = analyzeUserPatterns(pastData);

    return NextResponse.json({
      success: true,
      type,
      pod: generatedContent,
      insights,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Generate POD Error:', msg);
    return NextResponse.json({ error: 'Failed to generate POD', details: msg }, { status: 500 });
  }
}
