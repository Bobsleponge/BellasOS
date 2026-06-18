const WHISPER_HALLUCINATION =
  /^(thanks?\s*(you\s*)?for\s*(watching|listening)|please subscribe|subscribe to|like and subscribe|see you next time|copyright|\[music\]|\[applause\]|subtitle(s)?\s*by|amara\.org)/i;

const SAFETY_REFUSAL =
  /cannot provide information|can't provide information|can't help with|cannot help with|illegal or harmful|against my (guidelines|policy)|content policy|not able to assist|violat(e|es|ing) (our )?polic/i;

const EXPLICIT_HARMFUL_REQUEST =
  /\b(child\s*(porn|sexual|abuse|exploit)|csam|pedoph|molest|rape|murder|bomb|terror|suicide\s*method|make\s+(drugs|meth|weapon)|how\s+to\s+(hack|steal|kill))\b/i;

export function shouldRejectVoiceTranscript(text: string): boolean {
  const t = text.trim();
  if (!t || t.length <= 2) return true;
  if (WHISPER_HALLUCINATION.test(t)) return true;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length === 1 && words[0]!.length <= 3) return true;
  if (!/[aeiouAEIOUyY]/.test(t) && t.length < 24) return true;
  return false;
}

export function sanitizeJarvisReply(
  reply: string,
  userMessage: string,
  source?: 'voice' | 'text',
): string {
  if (!SAFETY_REFUSAL.test(reply.trim())) return reply;
  if (EXPLICIT_HARMFUL_REQUEST.test(userMessage.trim())) return reply;
  if (source === 'voice') {
    return "I didn't catch that - it might have been background noise. Try speaking again.";
  }
  if (userMessage.trim().length <= 120) {
    return "I didn't catch that - it might have been background noise. Try speaking again.";
  }
  return reply;
}
