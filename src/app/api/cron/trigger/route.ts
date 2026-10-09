import { NextResponse } from 'next/server';
import { evaluateAndRunSchedules } from '@/server/scheduler/engine';
import { PodActionType } from '@/types';

/**
 * Backwards-compatible route handler for /api/cron/trigger
 * Calls the centralized server-side scheduling engine.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';
    const targetType = searchParams.get('type') as PodActionType | null;

    const report = await evaluateAndRunSchedules(
      new Date(),
      undefined,
      force && targetType ? targetType : undefined
    );

    return NextResponse.json({
      success: true,
      timestamp: report.timestamp,
      triggered: report.details.filter((d) => d.status === 'SUCCESS' || d.status === 'RUNNING'),
      report,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[API /api/cron/trigger Error]:', errorMsg);
    return NextResponse.json({ error: 'Internal Server Error', details: errorMsg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
