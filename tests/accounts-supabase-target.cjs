const assert = require('node:assert/strict');

function loopbackOrigin(address) {
  const url = new URL(address);
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Expected a loopback origin.');
  return url.origin;
}

function integrationTarget() {
  const ref = process.env.DT_TEST_SUPABASE_HOSTED_REF;
  if (ref) assert.match(ref, /^[a-z]{20}$/, 'Use the explicitly approved development project reference.');
  const url = process.env.DT_TEST_SUPABASE_URL || (ref && process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.DT_TEST_SUPABASE_KEY || (ref && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const secret = process.env.DT_TEST_SUPABASE_SECRET || (ref && process.env.SUPABASE_SECRET_KEY);
  if (!url || !key || !secret) return null;
  const origin = ref ? 'https://' + ref + '.supabase.co' : loopbackOrigin(url);
  assert.ok(url.replace(/\/$/, '') === origin, 'The test URL does not match the approved development target.');
  return {url:origin, key, secret, hosted:!!ref};
}

module.exports = {integrationTarget, loopbackOrigin};
