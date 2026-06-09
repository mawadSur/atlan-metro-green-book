#!/usr/bin/env node
// send-push.mjs — fire a single test push straight at the Expo Push API.
//
// This bypasses the deployed push-broadcast Edge Function and the service-role
// key entirely: the Expo Push API only needs a device's ExponentPushToken, so
// this is the fastest way to verify the *remote delivery* leg (FCM/APNs creds
// in EAS + the app's notification handler + tap→deep-link routing) once you
// have a real dev/preview build on a physical device.
//
// Get the token: run the app (EAS dev build) on a real device, opt in from the
// More tab, and read the ExponentPushToken[...] it registers (the in-app DEV
// "Send test notification" button logs it; or add a console.log in push.ts).
//
// Usage:
//   node scripts/send-push.mjs 'ExponentPushToken[xxxxxxxx]' \
//     --title "Spain vs Saudi Arabia" \
//     --body "Kickoff in 1 hour — prayer spaces & halal nearby" \
//     --url "/match/spain-saudi-arabia"
//
// --url (optional) becomes data.url, which the app routes to on tap.

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        args[key] = true;
      } else {
        args[key] = next;
        i++;
      }
    } else {
      args._.push(a);
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const token = args._[0];

if (!token || args.help) {
  console.error(
    'Usage: node scripts/send-push.mjs <ExponentPushToken[...]> ' +
      '--title "..." --body "..." [--url "/match/slug"]'
  );
  process.exit(token ? 0 : 1);
}

if (!/^Expo(nent)?PushToken\[[A-Za-z0-9._-]+\]$/.test(token)) {
  console.error(`✗ "${token}" is not a valid Expo push token.`);
  console.error('  Expected form: ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]');
  process.exit(1);
}

const title = typeof args.title === 'string' ? args.title : 'Test notification';
const body =
  typeof args.body === 'string'
    ? args.body
    : 'If you can see this, push works 🎉';

const message = {
  to: token,
  title,
  body,
  sound: 'default',
  ...(typeof args.url === 'string' ? { data: { url: args.url } } : {}),
};

console.log('→ Sending to Expo Push API:');
console.log(JSON.stringify(message, null, 2));

const res = await fetch(EXPO_PUSH_URL, {
  method: 'POST',
  headers: {
    accept: 'application/json',
    'content-type': 'application/json',
  },
  body: JSON.stringify(message),
});

const result = await res.json();
const ticket = result?.data;

console.log('\n← Expo response:');
console.log(JSON.stringify(result, null, 2));

if (ticket?.status === 'ok') {
  console.log(`\n✓ Accepted (receipt id: ${ticket.id}).`);
  console.log('  The device should show the notification within a few seconds.');
  console.log('  Note: "ok" means Expo queued it — if it never arrives, the');
  console.log('  cause is almost always missing FCM/APNs credentials in EAS.');
  process.exit(0);
} else {
  const err = ticket?.details?.error ?? ticket?.message ?? 'unknown error';
  console.error(`\n✗ Push rejected: ${err}`);
  if (err === 'DeviceNotRegistered') {
    console.error('  This token is stale (app uninstalled or reinstalled).');
  }
  process.exit(1);
}
