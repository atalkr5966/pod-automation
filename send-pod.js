require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const https = require('https');

// For fetching Slack webhook from env or user settings
let webhookUrl = process.env.SLACK_WEBHOOK_URL;

// Read users data if available
const usersFilePath = path.join(__dirname, 'data', 'users.json');
let usersData = [];
if (fs.existsSync(usersFilePath)) {
  try {
    usersData = JSON.parse(fs.readFileSync(usersFilePath, 'utf-8'));
  } catch (e) {
    console.warn('Could not read users.json, using fallback.');
  }
}

const activeUser = usersData[0];

if (!webhookUrl && activeUser && activeUser.channels && activeUser.channels.slack) {
  webhookUrl = activeUser.channels.slack.webhookUrl;
}

function formatSlackDate(date = new Date()) {
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

const DOMAIN_TASK_BANKS = {
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
    ],
  },
};

function generatePodFromPastData(type = 'OPENING') {
  const now = new Date();
  const formattedDate = formatSlackDate(now);
  const divider = '----------------------------------------';
  const header = type === 'CLOSING' ? 'Closing action item for the Day:' : 'Opening action item for the Day:';
  const projectCode = '088_npci_pso';

  const memberNames = ['@Prabhat Kumar', '@Ankita', '@Rishikesh Sharma', '@Atal Pandey'];
  const lines = [header, formattedDate, projectCode, divider];

  const dateSeed = now.getDate();

  memberNames.forEach((member, mIdx) => {
    lines.push(member);
    lines.push(':p1: P1 tasks');

    const domain = DOMAIN_TASK_BANKS[member];
    const selected = [];

    // Add routine
    if (domain && domain.routine) {
      domain.routine.forEach((r) => selected.push(r));
    }

    // Add dynamic tasks without repetition
    if (domain && domain.dynamic) {
      const dynamicCount = member.includes('Rishikesh') || member.includes('Prabhat') ? 4 : 3;
      for (let i = 0; i < domain.dynamic.length && selected.length < (domain.routine.length + dynamicCount); i++) {
        const idx = (dateSeed + mIdx * 2 + i * 3) % domain.dynamic.length;
        const candidate = domain.dynamic[idx];
        if (!selected.includes(candidate)) {
          selected.push(candidate);
        }
      }
    }

    if (type === 'CLOSING') {
      selected.forEach((t, tidx) => {
        const isRoutine = domain && domain.routine.includes(t);
        const isInProgress = !isRoutine && (tidx === selected.length - 2 || t.toLowerCase().includes('onboard'));
        lines.push(isInProgress ? `${t} :hourglass_flowing_sand:` : `${t} :white_check_mark:`);
      });
    } else {
      selected.forEach((t) => lines.push(t));
    }

    lines.push(divider);
  });

  return lines.join('\n');
}

function sendToSlack(text) {
  if (!webhookUrl) {
    console.error("❌ SLACK_WEBHOOK_URL is not set in .env.local file or user settings.");
    return;
  }

  const postData = JSON.stringify({ text });
  const url = new URL(webhookUrl);
  const options = {
    hostname: url.hostname,
    port: 443,
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(options, (res) => {
    let sendData = '';
    res.on('data', (chunk) => {
      sendData += chunk;
    });

    res.on('end', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log('✅ Successfully sent POD to Slack!');
      } else {
        console.error(`❌ Failed to send to Slack (Status ${res.statusCode}):`, sendData);
      }
    });
  });

  req.on('error', (err) => {
    console.error('❌ Error calling Slack webhook:', err.message);
  });

  req.write(postData);
  req.end();
}

const argType = process.argv.includes('--closing') ? 'CLOSING' : 'OPENING';
console.log(`🚀 Generating and sending ${argType} POD to Slack matching exact Past Data format...`);
const podContent = generatePodFromPastData(argType);
console.log('\n--- Generated POD Content ---');
console.log(podContent);
console.log('-----------------------------\n');
sendToSlack(podContent);
