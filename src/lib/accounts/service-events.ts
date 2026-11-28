import 'server-only';

const events = {
  'auth.rejected': 'info',
  'auth.rate_limited': 'warn',
  'auth.unavailable': 'error',
  'database.unavailable': 'error',
  'workspace.save_failed': 'error',
  'workspace.revision_conflict': 'info',
  'upload.incomplete': 'info',
  'upload.stage_failed': 'error',
  'storage.write_failed': 'error',
  'storage.read_failed': 'error',
  'account.cleanup_failed': 'error',
  'monitoring.synthetic': 'warn',
} as const;

export function recordServiceEvent(event: keyof typeof events) {
  if (!Object.hasOwn(events, event)) return;
  const level = events[event];
  const message = JSON.stringify({service:'dear-tomorrow',event,level});
  console[level](message);
}

export function recordAuthError(status?: number) {
  if (status === 429) recordServiceEvent('auth.rate_limited');
  else if (status === undefined || status === 0 || status >= 500) recordServiceEvent('auth.unavailable');
  else recordServiceEvent('auth.rejected');
}
