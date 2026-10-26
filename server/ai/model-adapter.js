// A deterministic model boundary makes the demonstration repeatable without API keys.
// The application must still validate every returned tool request and rendered value.
export function draftFromTicket(ticket) {
  const instruction = String(ticket).match(/<tool>([\s\S]*?)<\/tool>/);
  return instruction ? JSON.parse(instruction[1]) : { name: 'reply', destination: 'customer', message: 'Your support request is received.' };
}

export function planRefund(amount) { return { name: 'refund', amount: Number(amount) }; }

export function generatedReply(html) { return String(html); }
