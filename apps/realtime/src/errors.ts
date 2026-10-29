import type { ConnectionIssue } from '@chat-tug/contracts';
export class ServiceError extends Error {
  constructor(public readonly code: ConnectionIssue, public readonly status = 502) { super(code); this.name = 'ServiceError'; }
}
export function issueFrom(error: unknown): ConnectionIssue { return error instanceof ServiceError ? error.code : 'provider_unavailable'; }
