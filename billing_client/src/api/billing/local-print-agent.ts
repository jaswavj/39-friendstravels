const AGENT_URL = 'http://127.0.0.1:9177/print';
const AGENT_MSG = 'Print agent is not running on this PC. Start start-print-agent.bat and leave the window open.';

export type PrintDispatch = {
  type?: string;
  billNo?: string;
  message?: string;
  printerName?: string;
  payload?: string;
  error?: string;
};

export const agentError = AGENT_MSG;

export async function sendToPrintAgent(printerName: string, payload: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(AGENT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ printerName, payload }),
    });
  } catch {
    throw new Error(AGENT_MSG);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || AGENT_MSG);
  }
}

export async function handleThermalDispatch(
  res: any,
  onA4?: (billNo: string) => Promise<void> | void
): Promise<'a4' | 'printed' | 'local'> {
  const data: PrintDispatch = res?.data || {};
  if (!res?.success) {
    throw new Error(data.error || 'Thermal print failed. Check printer name in Company Details.');
  }
  if (data.type === 'a4') {
    await onA4?.(data.billNo || '');
    return 'a4';
  }
  // Local deploy: server already sent RAW to the named printer.
  if (data.type === 'printed') {
    return 'printed';
  }
  // Cloud deploy: shop-PC print agent (start-print-agent.bat must stay open).
  if (data.type === 'local') {
    if (!data.printerName || !data.payload) {
      throw new Error('Printer name not found.');
    }
    try {
      await sendToPrintAgent(data.printerName, data.payload);
      return 'local';
    } catch (err: any) {
      throw new Error(err?.message || AGENT_MSG);
    }
  }
  throw new Error('Thermal print did not run. Set the printer name in Company Details.');
}
