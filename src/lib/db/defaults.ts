import { PastDataEntry } from './types';

export function getDefaultPastData(): PastDataEntry[] {
  const today = new Date();
  const formatPastDate = (daysAgo: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  return [
    {
      id: 'log-1',
      date: formatPastDate(3),
      type: 'OPENING',
      category: 'Frontend & APIs',
      tasks: [
        'Review sprint backlog and daily priority items',
        'Implement responsive glassmorphism UI components',
        'Integrate multi-channel webhook dispatch API',
      ],
      notes: 'Sync with team scheduled for 11:00 AM',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'log-2',
      date: formatPastDate(3),
      type: 'CLOSING',
      category: 'Frontend & APIs',
      tasks: [
        'Completed UI components and webhook integrations',
        'Fixed state synchronizations on dashboard',
        'Tested webhook payload triggers with Slack & Discord',
      ],
      notes: 'All PRs submitted for review. Tomorrow focus on scheduling daemon.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'log-3',
      date: formatPastDate(2),
      type: 'OPENING',
      category: 'Backend & Automation',
      tasks: [
        'Review weekend production metrics & logs',
        'Build cron scheduling daemon for automated POD delivery',
        'Sync with backend lead at 2:00 PM',
      ],
      notes: 'No blockers. Target release scheduled for end of week.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'log-4',
      date: formatPastDate(2),
      type: 'CLOSING',
      category: 'Backend & Automation',
      tasks: [
        'Delivered node-cron daemon integration',
        'Successfully dispatched test alerts to Telegram bot',
        'Resolved timezone offset calculations for Asia/Kolkata',
      ],
      notes: 'Ready for full integration testing.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'log-5',
      date: formatPastDate(1),
      type: 'OPENING',
      category: 'Testing & Release',
      tasks: [
        'End-to-end testing of user login and channel management',
        'Prepare release notes and user documentation',
        'Final sprint wrap-up review',
      ],
      notes: 'High priority release today.',
      createdAt: new Date().toISOString(),
    },
  ];
}
