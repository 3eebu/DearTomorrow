const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');

test('password recovery proof requires the verified session and expires on the server', () => {
  const source = readFileSync(resolve(__dirname, '../src/lib/accounts/recovery.ts'), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  runInNewContext(outputText, {
    exports, Buffer,
    require: name => name === './config' ? {appOrigin: () => 'https://staging.test'} :
      name === 'node:crypto' ? require(name) : {},
    process: {env: {SUPABASE_SECRET_KEY: 'fixture-signing-secret'}},
  });
  const now = 1_800_000_000_000;
  const proof = exports.recoveryProof('recovered-session', now);
  assert.ok(exports.verifiesRecovery(proof, 'recovered-session', now + 100));
  assert.equal(exports.verifiesRecovery(proof, 'password-or-oauth-session', now + 100), false);
  assert.equal(exports.verifiesRecovery(proof, 'recovered-session', now + 15 * 60 * 1000), false);
  assert.equal(exports.verifiesRecovery(proof.replace(/^\d+/, String(now + 1000)), 'recovered-session', now), false);
  assert.equal(exports.verifiesRecovery(undefined, 'recovered-session', now), false);
  assert.equal(exports.recoveryCookieOptions().httpOnly, true);
  assert.equal(exports.recoveryCookieOptions().secure, true);
});
