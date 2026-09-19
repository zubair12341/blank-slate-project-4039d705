export type PrintJobType = 'KOT' | 'CUSTOMER_RECEIPT' | 'TEST';

export interface LocalPrintJob {
  jobId: string;
  type: PrintJobType;
  printer?: string;
  content: string;
  copies?: number;
}

export interface PrintBridgeHealth {
  ok: boolean;
  service: string;
  version: string;
  printer?: string;
}

const BRIDGE_URL = (import.meta.env.VITE_PRINT_BRIDGE_URL || 'http://127.0.0.1:18181').replace(/\/$/, '');
const BRIDGE_TOKEN = import.meta.env.VITE_PRINT_BRIDGE_TOKEN || '';

const bridgeHeaders = () => ({
  'Content-Type': 'application/json',
  ...(BRIDGE_TOKEN ? { 'X-Print-Bridge-Token': BRIDGE_TOKEN } : {}),
});

export const createPrintJobId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `print-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export async function getPrintBridgeHealth(timeoutMs = 1500): Promise<PrintBridgeHealth> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${BRIDGE_URL}/health`, {
      method: 'GET',
      headers: bridgeHeaders(),
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Print bridge health failed (${response.status})`);
    return await response.json();
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function sendLocalPrintJob(job: LocalPrintJob): Promise<{ ok: boolean; duplicate?: boolean; jobId: string }> {
  const response = await fetch(`${BRIDGE_URL}/print`, {
    method: 'POST',
    headers: bridgeHeaders(),
    body: JSON.stringify({ ...job, copies: Math.max(1, Math.min(job.copies || 1, 3)) }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || `Local print failed (${response.status})`);
  }
  return payload;
}

export async function sendBridgeTestPrint(printer?: string) {
  return sendLocalPrintJob({
    jobId: createPrintJobId(),
    type: 'TEST',
    printer,
    content: [
      'ARABIC SHINWARI RESTAURANT',
      'LOCAL PRINT BRIDGE TEST',
      new Date().toLocaleString('en-PK'),
      '--------------------------------',
      'Silent printing connection: OK',
      '--------------------------------',
      '',
      '',
    ].join('\n'),
  });
}
