"use client";
import { PageHeading } from '@/components/app-shell';
import { ButtonLink, Panel } from '@/components/ui';
import { ShowdownHistory } from '@/components/showdown-result';
import { useConnection } from '@/lib/connection-store';
export default function HistoryPage() {
  const { snapshot, feed } = useConnection();
  return <><PageHeading title="Round history" description="The latest 20 showdowns and your commitments in this control-room session."><ButtonLink href="/dashboard" variant="secondary">Back to control room</ButtonLink></PageHeading>
    {feed !== 'live' && <p className="inline-message warning" role="status">{feed === 'loading' ? 'Loading showdown history.' : 'Updates are unavailable. Showing the last history received.'}</p>}
    <Panel title="Showdown history"><ShowdownHistory history={snapshot?.showdown?.history ?? []} /></Panel><p className="history-retention">History is kept for this session. A server restart or expired session clears it. “Committed” records your intention; it does not verify an action inside your game.</p></>;
}
