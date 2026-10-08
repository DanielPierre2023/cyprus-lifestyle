// lib/aiReply.ts — reading an Anthropic Messages reply. Pure (no I/O), unit-tested.
//
// Newer Claude models (sonnet-5 / opus-5) can put a hidden reasoning ("thinking") block BEFORE the text, and those reasoning
// tokens are counted against max_tokens. With a tight max_tokens the whole budget goes on reasoning, the reply has no text
// block, stop_reason is "max_tokens", and the caller sees an empty string while still paying for the tokens. This helper reads
// every text block and, when there is none, says exactly why, so an empty reply is never a silent mystery again.
export interface ClaudeReply { text: string; stop: string; blocks: string[]; outputTokens: number }

export function readClaudeReply(data: unknown): ClaudeReply {
  const d = (data && typeof data === 'object' ? data : {}) as { content?: unknown; stop_reason?: unknown; usage?: { output_tokens?: unknown } };
  const content = Array.isArray(d.content) ? (d.content as { type?: string; text?: string }[]) : [];
  const text = content.filter((b) => b?.type === 'text' && b.text).map((b) => b.text).join('');
  return {
    text,
    stop: typeof d.stop_reason === 'string' ? d.stop_reason : '?',
    blocks: content.map((b) => b?.type || '?'),
    outputTokens: Number(d.usage?.output_tokens) || 0,
  };
}

/** The error to report for a reply without text. */
export const emptyReplyError = (r: ClaudeReply): string =>
  `empty reply (stop=${r.stop}; blocks=[${r.blocks.join(',') || 'none'}]${r.stop === 'max_tokens' ? '; the token budget was used up before any text, raise max_tokens' : ''})`;

/** True when the API rejected the optional "thinking" field, so the call can be repeated without it. */
export const rejectsThinkingField = (status: number, message: string | undefined): boolean =>
  status === 400 && /thinking/i.test(String(message || ''));
