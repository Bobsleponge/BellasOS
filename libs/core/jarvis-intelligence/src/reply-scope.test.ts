import { describe, expect, it } from 'vitest';
import { resolveReplyScope } from './reply-scope';

describe('resolveReplyScope', () => {
  it('uses minimal scope for net worth only', () => {
    expect(resolveReplyScope('tell me my net worth').scope).toBe('minimal');
    expect(resolveReplyScope('What is my net worth?').scope).toBe('minimal');
  });

  it('uses comprehensive scope for financial status', () => {
    expect(resolveReplyScope('what is my financial status').scope).toBe('comprehensive');
    expect(resolveReplyScope('give me a full financial overview').scope).toBe('comprehensive');
  });

  it('uses focused scope for list requests', () => {
    expect(resolveReplyScope('show my open decisions').scope).toBe('focused');
    expect(resolveReplyScope('list recent transactions').scope).toBe('focused');
  });

  it('uses comprehensive scope for briefings', () => {
    expect(resolveReplyScope('brief me on today').scope).toBe('comprehensive');
  });

  it('uses focused scope for short non-overview questions', () => {
    expect(resolveReplyScope('how many goals do I have?').scope).toBe('minimal');
  });
});
