/** Extract runnable HTML from LLM output. */
export function extractHtml(raw: string): string {
  const trimmed = raw.trim();
  const fence =
    trimmed.match(/```(?:html)?\s*([\s\S]*?)```/i)?.[1] ??
    trimmed.match(/```([\s\S]*?)```/)?.[1];
  const body = (fence ?? trimmed).trim();
  if (/<html[\s>]/i.test(body)) return body;
  if (/<!doctype/i.test(body)) return body;
  if (/<canvas|<script|<body|<div/i.test(body)) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Preview</title>
<style>html,body{margin:0;height:100%;background:#0a0e14;color:#e6edf6;font-family:system-ui,sans-serif}</style>
</head>
<body>${body}</body>
</html>`;
  }
  return body;
}

export function isPlayableHtml(html: string): boolean {
  return /<(canvas|script|svg|iframe)\b/i.test(html);
}
