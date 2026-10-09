import { dbService } from '@/server/db';
import { sendSlackMessage } from '@/server/slack/client';
import { isActionDue, buildExecutionKey } from '@/lib/timezone';
import { generateOpeningPod, generateClosingPod } from '@/lib/analyzer';
import {
  CronExecutionReport,
  PodActionType,
  ExecutionStatus,
  AutomationSchedule,
} from '@/types';

// Configurable missed job policy: default 15 minutes window
const TOLERANCE_MINUTES = parseInt(process.env.CRON_TOLERANCE_MINUTES || '15', 10);

export async function evaluateAndRunSchedules(
  now: Date = new Date(),
  forceScheduleId?: string,
  forceActionType?: PodActionType
): Promise<CronExecutionReport> {
  const activeSchedules = await dbService.getActiveSchedules();
  const schedulesToEvaluate = forceScheduleId
    ? activeSchedules.filter((s) => s.id === forceScheduleId)
    : activeSchedules;

  const report: CronExecutionReport = {
    timestamp: now.toISOString(),
    schedulesEvaluated: schedulesToEvaluate.length,
    jobsTriggered: 0,
    jobsSucceeded: 0,
    jobsFailed: 0,
    jobsSkipped: 0,
    details: [],
  };

  for (const schedule of schedulesToEvaluate) {
    // 1. Evaluate Opening Action
    if (schedule.openingEnabled || (forceScheduleId && forceActionType === 'OPENING')) {
      await processScheduleAction({
        schedule,
        actionType: 'OPENING',
        scheduledTime: schedule.openingTime,
        now,
        isForced: forceScheduleId ? forceActionType === 'OPENING' : false,
        report,
      });
    }

    // 2. Evaluate Closing Action
    if (schedule.closingEnabled || (forceScheduleId && forceActionType === 'CLOSING')) {
      await processScheduleAction({
        schedule,
        actionType: 'CLOSING',
        scheduledTime: schedule.closingTime,
        now,
        isForced: forceScheduleId ? forceActionType === 'CLOSING' : false,
        report,
      });
    }
  }

  return report;
}

interface ProcessActionParams {
  schedule: AutomationSchedule;
  actionType: PodActionType;
  scheduledTime: string;
  now: Date;
  isForced: boolean;
  report: CronExecutionReport;
}

async function processScheduleAction(params: ProcessActionParams) {
  const { schedule, actionType, scheduledTime, now, isForced, report } = params;

  const dueCheck = isActionDue(
    scheduledTime,
    schedule.daysOfWeek,
    schedule.timezone,
    TOLERANCE_MINUTES,
    now
  );

  if (!dueCheck.isDue && !isForced) {
    return;
  }

  // Build unique atomic idempotency key: exec_<scheduleId>_<targetDate>_<actionType>
  const targetDateStr = dueCheck.targetDateStr;
  const executionKey = isForced
    ? `exec_manual_${schedule.id}_${targetDateStr}_${actionType}_${now.getTime()}`
    : buildExecutionKey(schedule.id, targetDateStr, actionType);

  // Quick check if already executed
  const alreadyExecuted = await dbService.hasExecutionKey(executionKey);
  if (alreadyExecuted && !isForced) {
    report.jobsSkipped++;
    report.details.push({
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      actionType,
      status: 'SKIPPED',
      executionKey,
      channel: schedule.channelId,
    });
    return;
  }

  // Acquire atomic execution lock in PostgreSQL (database-enforced concurrency mutex)
  const execLog = isForced
    ? await dbService.recordExecutionStart({
        scheduleId: schedule.id,
        executionKey,
        actionType,
        channel: schedule.channelId,
      })
    : await dbService.claimExecutionLock({
        scheduleId: schedule.id,
        executionKey,
        actionType,
        channel: schedule.channelId,
      });

  if (!execLog) {
    // Another concurrent process already claimed this slot in PostgreSQL
    report.jobsSkipped++;
    report.details.push({
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      actionType,
      status: 'SKIPPED',
      executionKey,
      channel: schedule.channelId,
    });
    return;
  }

  report.jobsTriggered++;
  const startTime = Date.now();

  try {
    // 1. Fetch domain past data for this workspace
    const pastData = await dbService.getPastData(schedule.workspaceId);

    // 2. Generate authentic domain content
    const content =
      actionType === 'OPENING'
        ? generateOpeningPod(pastData)
        : generateClosingPod(pastData);

    // 3. Look up workspace Slack connection
    const slackConn = await dbService.getSlackConnection(schedule.workspaceId);

    // 4. Dispatch to Slack server-side
    const sendRes = await sendSlackMessage({
      webhookUrl: slackConn?.webhookUrl,
      botToken: slackConn?.botAccessToken,
      channel: schedule.channelId || slackConn?.defaultChannel || '#general',
      text: content,
    });

    const durationMs = Date.now() - startTime;
    const finalStatus: ExecutionStatus =
      sendRes.status === 'SIMULATED'
        ? 'SIMULATED'
        : sendRes.success
        ? 'SUCCESS'
        : 'FAILED';

    // 5. Record delivery log
    await dbService.recordDelivery({
      executionId: execLog.id,
      slackChannelId: sendRes.channel || schedule.channelId,
      slackMessageTs: sendRes.messageTs,
      status: sendRes.status,
      response: sendRes.rawResponse,
    });

    // 6. Complete execution log
    await dbService.recordExecutionComplete(execLog.id, {
      status: finalStatus,
      durationMs,
      errorMessage: sendRes.error,
      retryCount: 0,
    });

    // 7. Update connection status & last delivery
    if (slackConn && sendRes.success) {
      await dbService.upsertSlackConnection({
        workspaceId: schedule.workspaceId,
        lastDeliveryAt: new Date().toISOString(),
        status: 'CONNECTED',
      });
    }

    if (finalStatus === 'SUCCESS' || finalStatus === 'SIMULATED') {
      report.jobsSucceeded++;
    } else {
      report.jobsFailed++;
    }

    report.details.push({
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      actionType,
      status: finalStatus,
      executionKey,
      error: sendRes.error,
      channel: schedule.channelId,
    });
  } catch (err: unknown) {
    const durationMs = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : String(err);

    await dbService.recordExecutionComplete(execLog.id, {
      status: 'FAILED',
      durationMs,
      errorMessage: errorMsg,
      retryCount: 0,
    });

    report.jobsFailed++;
    report.details.push({
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      actionType,
      status: 'FAILED',
      executionKey,
      error: errorMsg,
      channel: schedule.channelId,
    });
  }
}
