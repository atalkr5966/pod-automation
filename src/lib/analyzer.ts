import { PastDataEntry, User } from './storage';

export interface AnalysisInsights {
  totalLogs: number;
  topCategories: { name: string; count: number }[];
  recurringTasks: string[];
  recentPendingTasks: string[];
  averageTasksPerDay: number;
}

export function analyzeUserPatterns(pastData: PastDataEntry[]): AnalysisInsights {
  if (!pastData || pastData.length === 0) {
    return {
      totalLogs: 0,
      topCategories: [],
      recurringTasks: [],
      recentPendingTasks: [],
      averageTasksPerDay: 0,
    };
  }

  const categoryMap: Record<string, number> = {};
  const taskFrequency: Record<string, number> = {};
  let totalTasksCount = 0;

  pastData.forEach((entry) => {
    const cat = entry.category || 'General Tasks';
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;

    entry.tasks.forEach((task) => {
      totalTasksCount++;
      const cleaned = task.trim().replace(/^[-*•\d.\s]+/, '');
      if (
        cleaned.length > 5 &&
        !cleaned.startsWith('@') &&
        !cleaned.startsWith(':') &&
        !cleaned.startsWith('---') &&
        !cleaned.toLowerCase().includes('action item')
      ) {
        taskFrequency[cleaned] = (taskFrequency[cleaned] || 0) + 1;
      }
    });
  });

  const topCategories = Object.entries(categoryMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const recurringTasks = Object.entries(taskFrequency)
    .filter(([_, count]) => count >= 2)
    .map(([task]) => task)
    .slice(0, 5);

  const sorted = [...pastData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const recentLogs = sorted.slice(0, 3);
  const recentTasks = recentLogs
    .flatMap((l) => l.tasks)
    .filter((t) => !t.startsWith('@') && !t.startsWith(':') && !t.startsWith('---'))
    .slice(0, 5);

  return {
    totalLogs: pastData.length,
    topCategories,
    recurringTasks:
      recurringTasks.length > 0
        ? recurringTasks
        : [
            'Daily team standup and sync',
            'Bank onboarding and integration support',
            'API testing and deployment verification',
          ],
    recentPendingTasks: recentTasks,
    averageTasksPerDay: Math.round((totalTasksCount / (pastData.length || 1)) * 10) / 10,
  };
}

/**
 * Format a date in the user's past data format:
 * e.g. ":date: 01st September 2026 :"
 */
export function formatSlackDate(date: Date = new Date()): string {
  const day = date.getDate();
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = months[date.getMonth()];
  const year = date.getFullYear();

  let suffix = 'th';
  if (day === 1 || day === 21 || day === 31) suffix = 'st';
  else if (day === 2 || day === 22) suffix = 'nd';
  else if (day === 3 || day === 23) suffix = 'rd';

  const dayStr = day < 10 ? `0${day}${suffix}` : `${day}${suffix}`;
  return `:date: ${dayStr} ${monthName} ${year} :`;
}

interface MemberSection {
  name: string;
  tag: string;
  tasks: string[];
}

interface ParsedPastLog {
  headerTitle: string;
  projectCode: string;
  divider: string;
  members: MemberSection[];
}

/**
 * Expanded Domain-Specific Task Bank for dynamic rotations across days.
 * Ensures every single day has unique, fresh tasks while maintaining domain authenticity.
 */
const DOMAIN_TASK_BANKS: Record<string, { routine: string[]; dynamic: string[] }> = {
  '@Prabhat Kumar': {
    routine: [
      'Check mails and respond back to Banks. - 30 mins',
      'Standup call with Agathiyan and team. - 30 mins',
    ],
    dynamic: [
      'Tap and Pay testing with both value chain. - 3 hrs',
      'Check BHIM issue for UAT 1 testing. - 2 hrs',
      'Check U63 issue for Indian Bank. - 1 hr',
      'Check UCO issue for UAT 3. - 1 hr',
      'Check MCB issue with dev. - 2 hrs',
      'Write TC with Rishikesh for RiskScore. - 1 hr',
      'Check Axis issue for UAT 3 connectivity. - 2 hrs',
      'Check HDFC issue for UAT 3. - 2 hrs',
      'Check PSO IP natting config. - 2 hrs',
      'Check NIC issue with Agathiyan. - 1 hr',
      'Validate Canara Bank callback timeouts on UAT 1. - 1.5 hrs',
      'Check IndusInd bank connectivity on UAT 2. - 2 hrs',
      'Verify ICICI debit auth flow on POC. - 1.5 hrs',
      'Prepare test report for UPI Tap & Pay pilot release. - 1 hr',
      'Review pending bank queries for PSO integration. - 1.5 hrs',
      'Test multi-terminal transaction simulation on UAT 3. - 2 hrs',
      'Validate refund and reversal callbacks for Tap & Pay. - 2.5 hrs',
      'Check Union Bank settlement discrepancies with dev. - 1 hr',
    ],
  },
  '@Ankita': {
    routine: [
      'Check all the services are running properly or not in both UAT1 and UAT2 - 45 mins',
    ],
    dynamic: [
      'Onboarding banks for testing Contexual payments - 3 hrs',
      'Call with Agathiyan for writing testcases and tsd - 1 hr',
      'Testing with SBI multi endpoint debit and credit issue - 3 hrs',
      'Testing Rust api with Sahil’s team in UPI POC - 1 hr',
      'Onboarding multiple banks for GFF in UPI POC - 2 hrs',
      'Testing Contexual payments with juspay - 3 hrs',
      'Onboard Canara & ICICI banks for contextual payments - 3 hrs',
      'Validate XML payload schema for Contextual payment requests - 1.5 hrs',
      'Verify token exchange mechanism for multi-endpoint banks - 2 hrs',
      'Prepare test scenarios for Axis Bank contextual integration - 2.5 hrs',
      'Review TSD document for multi-endpoint debit and credit - 1.5 hrs',
      'Coordinate with Agathiyan for GFF test case sign-off - 1 hr',
      'Validate merchant intent payload structure with Juspay team - 2 hrs',
      'Execute negative test cases for invalid token auth on UAT 2 - 1.5 hrs',
      'Test batch callback notification for multi-endpoint debit - 2.5 hrs',
    ],
  },
  '@Rishikesh Sharma': {
    routine: [
      'Standup call with Agathiyan. [30 min.]',
      'Go through the PSO emails and reply to the banks. [30 min.]',
      'Monitor the services of UAT 1, UAT 2, and UAT 3, and restart services if required. [30 min.]',
    ],
    dynamic: [
      'Write test cases for the UPI-based Risk Auth GFF project. [03 Hrs.]',
      'Deploy new patch on UPI POC server for Amazon Tap & Pay. [02 Hrs.]',
      'Onboard UCO in UAT 1 and add all required APIs. [1.5 Hrs.]',
      'Add all APIs for BHIM in UAT 3. [1.5 Hrs.]',
      'Check delayed response for ReqSync for Indian and HDFC Bank. [1.5 Hrs.]',
      'Check HDFC Cred Block issue. [01 Hr.]',
      'Raise BMC request regarding UCO Bank IP whitelisting and connect with PIM team. [45 min.]',
      'Deploy new Jars for UPI POC regarding Tap & Pay. [01 Hr.]',
      'Check delayed ReqSync and ReqListKeys issue in UAT 3. [01 Hr.]',
      'Provide support for Tap & Pay GFF project. [1.5 Hrs.]',
      'Check UB7 error for Yes Bank. [01 Hr.]',
      'Deploy new jars for GFF in UPI POC environment. [02 Hrs.]',
      'Validate biometric Auth payload with Risk engine APIs. [1.5 Hrs.]',
      'Investigate latency spikes on ReqPay handler for Yes Bank. [01 Hr. 30 min.]',
      'Update API routing configuration on UAT 3 for BHIM services. [01 Hr.]',
      'Refactor connection pool configurations for UPI Risk Auth. [02 Hrs.]',
      'Optimize database queries for ReqSync batch processing. [01.5 Hrs.]',
      'Verify encryption key rotation mechanism on POC servers. [01 Hr.]',
    ],
  },
  '@Atal Pandey': {
    routine: [
      'Standup call with Agathiyan and team - 30 mins',
      'Attend internal meet with the team - 30 mins',
      'Check live logs on all servers - 30 mins',
      'Restart the services on UAT 1, UAT 2 and UAT 3 if required - 40 mins',
      'Check emails and reply to banks - 30 mins',
    ],
    dynamic: [
      'Validate CUB Bank Transactions for GFF testing - 3 hrs',
      'Onboard PNB Bank for GFF on POC - 2 hrs',
      'Onboard BOB on UAT3 for UL - 1 hr',
      'Connect with Agathiyan and Parul to contextual Payment test cases - 1.5 hrs',
      'Connect with BHIM and check for U76 error on UAT1 - 3 hrs',
      'Check bank errors for GFF on POC UPI servers - 1 hr',
      'Restart all services from POC and PSO - 3 hrs',
      'Check Contextual Payment RespGetContext error on POC - 1.5 hr',
      'Checked BHIM issues on UAT1 and UAT3 - 2 hrs',
      'Verify Union Bank encryption key rotation on UAT2 - 1.5 hrs',
      'Validate Canara Bank GFF mandate creation callbacks - 2 hrs',
      'Check U19 error logs for Axis Bank in PSO environment - 1 hr',
      'Sync with Devops team for server resource allocation on POC - 45 mins',
      'Verify Redis cache synchronization across UAT clusters - 1.5 hrs',
      'Onboard IndusInd bank on UAT 3 for mandate creation - 2 hrs',
      'Validate payload serialization on PSO gateway for Yes Bank - 2 hrs',
    ],
  },
};

/**
 * Parses raw past data tasks to understand the user's template structure.
 */
export function parsePastDataTemplate(pastData: PastDataEntry[]): ParsedPastLog {
  const defaultDivider = '----------------------------------------';
  let headerTitle = 'Opening action item for the Day:';
  let projectCode = '088_npci_pso';
  let divider = defaultDivider;
  const membersMap = new Map<string, { tag: string; allTasks: string[] }>();

  // Look through past logs starting from latest
  const sorted = [...pastData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  for (const entry of sorted) {
    const lines = entry.tasks || [];
    let currentMember: string | null = null;
    let currentTag = ':p1: P1 tasks';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      if (line.toLowerCase().includes('action item for the day')) {
        headerTitle = line;
        continue;
      }
      if (line.startsWith(':date:')) {
        continue;
      }
      if (line.startsWith('---')) {
        divider = line;
        continue;
      }
      if (line.startsWith('@')) {
        currentMember = line;
        if (!membersMap.has(currentMember)) {
          membersMap.set(currentMember, { tag: ':p1: P1 tasks', allTasks: [] });
        }
        continue;
      }
      if (line.startsWith(':p') || line.startsWith(':task')) {
        currentTag = line;
        if (currentMember && membersMap.has(currentMember)) {
          membersMap.get(currentMember)!.tag = currentTag;
        }
        continue;
      }
      // If line is before any member and not divider, it might be project code
      if (!currentMember && !line.startsWith(':') && !line.startsWith('@') && !line.startsWith('-')) {
        projectCode = line;
        continue;
      }

      if (currentMember) {
        // Strip out closing status emojis for clean storage
        const cleanTask = line.replace(/:(white_check_mark|inprogress|hourglass_flowing_sand|hourglass|arrows_counterclockwise|done|pending):/g, '').replace(/[✅⏳🔄⌛]/g, '').trim();
        if (cleanTask) {
          membersMap.get(currentMember)!.allTasks.push(cleanTask);
        }
      }
    }
  }

  const members: MemberSection[] = [];
  membersMap.forEach((val, name) => {
    members.push({
      name,
      tag: val.tag,
      tasks: Array.from(new Set(val.allTasks)),
    });
  });

  // If no members were found (e.g. single user or default), build fallback members
  if (members.length === 0) {
    const defaultMemberNames = ['@Prabhat Kumar', '@Ankita', '@Rishikesh Sharma', '@Atal Pandey'];
    defaultMemberNames.forEach((name) => {
      members.push({
        name,
        tag: ':p1: P1 tasks',
        tasks: [],
      });
    });
  }

  return {
    headerTitle,
    projectCode,
    divider,
    members,
  };
}

/**
 * Analyzes member task history across past logs to automatically extract:
 * 1. Fixed Daily Routine Tasks (tasks that appear in 35%+ of logs or match daily sync keywords).
 * 2. Dynamic Sprint Tasks (tasks that change from day to day).
 * 3. Recent tasks from yesterday (to prevent back-to-back duplicate days).
 * 4. In-progress tasks from yesterday.
 */
function analyzeMemberTaskPatterns(
  memberName: string,
  pastData: PastDataEntry[]
): {
  routineTasks: string[];
  dynamicTasks: string[];
  recentUsedTasks: string[];
  inProgressTasks: string[];
} {
  const taskCountMap: Record<string, number> = {};
  const inProgressList: string[] = [];
  const recentUsedList: string[] = [];
  const totalLogs = pastData.length || 1;

  const sorted = [...pastData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  sorted.forEach((log, logIdx) => {
    let currentMember: string | null = null;
    log.tasks.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('@')) {
        currentMember = trimmed;
        return;
      }
      if (currentMember === memberName && !trimmed.startsWith(':p') && !trimmed.startsWith('---') && !trimmed.startsWith(':date:')) {
        const clean = trimmed.replace(/:(white_check_mark|inprogress|hourglass_flowing_sand|hourglass|arrows_counterclockwise|done|pending):/g, '').replace(/[✅⏳🔄⌛]/g, '').trim();
        taskCountMap[clean] = (taskCountMap[clean] || 0) + 1;

        if (logIdx <= 1) {
          recentUsedList.push(clean);
          if (
            trimmed.includes(':inprogress:') ||
            trimmed.includes(':hourglass_flowing_sand:') ||
            trimmed.includes(':arrows_counterclockwise:') ||
            trimmed.includes('⏳') ||
            trimmed.includes('🔄')
          ) {
            inProgressList.push(clean);
          }
        }
      }
    });
  });

  const domain = DOMAIN_TASK_BANKS[memberName];
  const routineTasks: string[] = [];
  const dynamicTasks: string[] = [];

  // Check known routine tasks from domain
  if (domain?.routine) {
    domain.routine.forEach((r) => {
      if (!routineTasks.includes(r)) routineTasks.push(r);
    });
  }

  // Auto-detect routines from past data history: tasks with high frequency or routine keywords
  Object.entries(taskCountMap).forEach(([task, count]) => {
    const isHighFreq = count / totalLogs >= 0.35;
    const lower = task.toLowerCase();
    const isRoutineKeyword =
      lower.includes('standup') ||
      lower.includes('meet with the team') ||
      lower.includes('check live logs') ||
      lower.includes('check mails and respond') ||
      lower.includes('reply to banks') ||
      lower.includes('monitor the services') ||
      lower.includes('running properly or not');

    if (isHighFreq || isRoutineKeyword) {
      if (!routineTasks.includes(task)) {
        routineTasks.push(task);
      }
    } else {
      if (!dynamicTasks.includes(task)) {
        dynamicTasks.push(task);
      }
    }
  });

  // Merge with pre-populated domain tasks for rich variation
  if (domain?.dynamic) {
    domain.dynamic.forEach((dt) => {
      if (!dynamicTasks.includes(dt) && !routineTasks.includes(dt)) {
        dynamicTasks.push(dt);
      }
    });
  }

  return {
    routineTasks,
    dynamicTasks,
    recentUsedTasks: Array.from(new Set(recentUsedList)),
    inProgressTasks: Array.from(new Set(inProgressList)),
  };
}

/**
 * Synthesizes a list of distinct, non-repeating tasks for a specific member on a given day.
 * - Always includes their learned Daily Routine Tasks.
 * - Rotates Dynamic Tasks so that every single day has unique, fresh sprint items.
 * - Excludes yesterday's tasks.
 */
function synthesizeMemberTasks(
  member: MemberSection,
  pastData: PastDataEntry[],
  isClosing: boolean,
  customContext?: string,
  memberIndex: number = 0
): string[] {
  const memberName = member.name;
  const analysis = analyzeMemberTaskPatterns(memberName, pastData);

  const selectedTasks: string[] = [];

  // 1. ALWAYS ADD DAILY ROUTINE TASKS (Learned from past data)
  // Typically 1-2 fixed routines (e.g. standup, email check, live logs)
  analysis.routineTasks.slice(0, 2).forEach((rt) => {
    selectedTasks.push(rt);
  });

  // 2. IF YESTERDAY HAD IN-PROGRESS TASKS, CARRY OVER / ADVANCE 1 ITEM
  if (analysis.inProgressTasks.length > 0) {
    const carryOver = analysis.inProgressTasks[0];
    if (!selectedTasks.includes(carryOver)) {
      selectedTasks.push(carryOver);
    }
  }

  // 3. SELECT COMPLETELY UNIQUE DYNAMIC SPRINT TASKS FOR TODAY
  // Filter out tasks used yesterday or already in selected
  const unusedDynamic = analysis.dynamicTasks.filter(
    (t) => !analysis.recentUsedTasks.includes(t) && !selectedTasks.includes(t)
  );

  const dynamicPool = unusedDynamic.length >= 3 ? unusedDynamic : analysis.dynamicTasks;

  // Calendar Day Deterministic Seed (guarantees a fresh, unique task set every single day)
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

  const targetDynamicCount = memberName.includes('Rishikesh') || memberName.includes('Prabhat') ? 4 : 3;
  let addedDynamic = 0;

  for (let i = 0; i < dynamicPool.length && addedDynamic < targetDynamicCount; i++) {
    // Unique deterministic index for today
    const index = (dayOfYear * 7 + memberIndex * 13 + i * 5) % dynamicPool.length;
    const candidate = dynamicPool[index];
    if (!selectedTasks.includes(candidate)) {
      selectedTasks.push(candidate);
      addedDynamic++;
    }
  }

  // 4. INJECT CUSTOM CONTEXT (if user provided any today)
  if (customContext && customContext.trim()) {
    if (memberName.includes('Atal') || memberName.includes('Rishikesh') || memberName === member.name) {
      selectedTasks.push(`${customContext.trim()} - 1.5 hrs`);
    }
  }

  // 5. IF CLOSING POD, ATTACH STATUS BADGES (:white_check_mark: / :hourglass_flowing_sand:)
  if (isClosing) {
    return selectedTasks.map((t, idx) => {
      const isRoutine = analysis.routineTasks.includes(t);
      // Routines and first dynamic tasks are completed
      // The last complex onboarding/validation task is marked inprogress
      const isLastDynamic = idx === selectedTasks.length - 2 && !isRoutine;
      const isInProgress = isLastDynamic || t.toLowerCase().includes('onboarding') || t.toLowerCase().includes('validat');
      return isInProgress ? `${t} :hourglass_flowing_sand:` : `${t} :white_check_mark:`;
    });
  }

  return selectedTasks;
}

/**
 * Generate Morning Opening POD in the exact Slack format of the user's past data.
 */
export function generateOpeningPod(user: User, customContext?: string): string {
  const now = new Date();
  const formattedDate = formatSlackDate(now);
  const pastData = user.pastData || [];
  const template = parsePastDataTemplate(pastData);

  const lines: string[] = [];
  lines.push('Opening action item for the Day:');
  lines.push(formattedDate);
  lines.push(template.projectCode || '088_npci_pso');
  lines.push(template.divider);

  template.members.forEach((member, mIdx) => {
    lines.push(member.name);
    lines.push(member.tag || ':p1: P1 tasks');

    const tasks = synthesizeMemberTasks(member, pastData, false, customContext, mIdx);
    tasks.forEach((t) => lines.push(t));

    lines.push(template.divider);
  });

  return lines.join('\n');
}

/**
 * Generate Evening Closing (EOD) POD in the exact Slack format with completion status tags.
 */
export function generateClosingPod(user: User, customContext?: string): string {
  const now = new Date();
  const formattedDate = formatSlackDate(now);
  const pastData = user.pastData || [];
  const template = parsePastDataTemplate(pastData);

  const lines: string[] = [];
  lines.push('Closing action item for the Day:');
  lines.push(formattedDate);
  lines.push(template.projectCode || '088_npci_pso');
  lines.push(template.divider);

  template.members.forEach((member, mIdx) => {
    lines.push(member.name);
    lines.push(member.tag || ':p1: P1 tasks');

    const tasks = synthesizeMemberTasks(member, pastData, true, customContext, mIdx);
    tasks.forEach((t) => lines.push(t));

    lines.push(template.divider);
  });

  return lines.join('\n');
}
