/* ═══════════════════ OUNS · Error Telemetry & Logger ═══════════════════ */
const MAX_ERRORS = 10;
const errorLog = [];

export function logError(err, context = 'runtime') {
  const item = {
    time: new Date().toISOString(),
    context,
    message: err && err.message ? String(err.message) : String(err),
    stack: err && err.stack ? String(err.stack).slice(0, 500) : null
  };
  errorLog.push(item);
  if (errorLog.length > MAX_ERRORS) errorLog.shift();
  if (typeof console !== 'undefined' && console.error) {
    console.error(`[Ouns ${context}]`, err);
  }
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('ouns:error', { detail: item }));
  }
  return item;
}

export function initTelemetry() {
  if (typeof window === 'undefined') return;
  window.addEventListener('error', e => {
    logError(e.error || e.message, 'uncaught');
  });
  window.addEventListener('unhandledrejection', e => {
    logError(e.reason, 'unhandledrejection');
  });
}

export function getErrorLog() {
  return [...errorLog];
}
