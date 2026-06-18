/** User wants to abort the current Jarvis turn (misheard, wrong transcript, etc.). */
export function isVoiceCancelCommand(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  return (
    /^(stop|cancel|abort|never\s*mind|nevermind|wait|hold\s+on|hang\s+on)\b/.test(t) ||
    /^(that'?s?\s+wrong|wrong|not\s+that|ignore\s+that|forget\s+that|scratch\s+that)\b/.test(t) ||
    /^(don'?t\s+do\s+that|do\s+not\s+do\s+that|don'?t\s+respond|stop\s+jarvis)\b/.test(t)
  );
}

export const VOICE_CANCEL_HINT =
  'Say "stop" or "cancel", or tap Stop, if Jarvis misheard you.';
