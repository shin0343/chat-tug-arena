"use client";
import { useEffect, useRef } from 'react';
import { Button } from './ui';

export function ConfirmRoundAction({ open, title, description, confirmLabel, busy, onCancel, onConfirm }: { open: boolean; title: string; description: string; confirmLabel: string; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null), cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const element = dialog.current; if (!open || !element) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element.showModal(); cancel.current?.focus();
    return () => { element.close(); if (trigger?.isConnected) trigger.focus(); };
  }, [open]);
  return <dialog ref={dialog} className="round-confirm" aria-labelledby="round-confirm-title" aria-describedby="round-confirm-description" aria-busy={busy} onKeyDown={event => {
    if (event.key !== 'Tab') return;
    const buttons = dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
    if (!buttons?.length) { event.preventDefault(); return; }
    const first = buttons[0]!, last = buttons[buttons.length - 1]!;
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }} onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}>
    <h2 id="round-confirm-title">{title}</h2><p id="round-confirm-description">{description}</p>
    <div className="confirm-actions"><button ref={cancel} className="btn btn-secondary" type="button" disabled={busy} onClick={onCancel}>Keep the round</button><Button type="button" disabled={busy} onClick={onConfirm}>{confirmLabel}</Button></div>
  </dialog>;
}
