"use client";
import { useState, type FormEvent } from 'react';
import { DEFAULT_SHOWDOWN, SHOWDOWN_TEMPLATES, TEMPLATE_COPY, ROUND_DURATIONS, choiceAction, normalizeConfig, validateShowdownConfig, validateKeywords, type ShowdownConfig, type ShowdownTemplate, type TeamKeywords } from '@chat-tug/contracts';
import { useConnection, ConnectionError } from '@/lib/connection-store';
import { Arena } from './arena';
import { Button, ButtonLink, Icon } from './ui';
import { actionError } from './game';

type Draft = { config: ShowdownConfig; commands: TeamKeywords; revision: number };
export function RoundForm() {
  const { snapshot, feed, busy, action } = useConnection();
  const [edited, setEdited] = useState<Draft | null>(null), [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean } | null>(null);
  const saved = snapshot?.showdown;
  const draft: Draft = edited ?? { config: saved?.draft ?? { ...DEFAULT_SHOWDOWN }, commands: snapshot?.commands ?? { coral: '!mage', mint: '!knight' }, revision: saved?.settingsRevision ?? 0 };
  const config = draft.config, game = snapshot?.game;
  const pending = Boolean(saved?.current?.winner && !saved.current.committedAt);
  const locked = Boolean(game && ['COUNTDOWN', 'ACTIVE', 'PAUSED'].includes(game.state)) || pending;
  const stale = edited !== null && saved !== undefined && edited.revision !== saved.settingsRevision;
  function change(key: keyof ShowdownConfig, value: ShowdownConfig[keyof ShowdownConfig]) {
    setEdited({ ...draft, config: { ...config, [key]: value } }); setFeedback(null); setErrors(previous => ({ ...previous, [key]: '' }));
  }
  function keyword(team: 'coral' | 'mint', value: string) {
    setEdited({ ...draft, commands: { ...draft.commands, [team]: value } }); setFeedback(null); setErrors(previous => ({ ...previous, [`${team}Keyword`]: '' }));
  }
  function template(value: ShowdownTemplate) {
    const preset = TEMPLATE_COPY[value];
    setEdited({ ...draft, config: { ...config, template: value, title: preset.title, coralName: preset.coralName, mintName: preset.mintName, consequenceType: 'apply_choice', coralAction: '', mintAction: '' }, commands: { coral: preset.coral, mint: preset.mint } });
    setErrors({}); setFeedback({ text: `${preset.label} template applied. Review and save your changes.` });
  }
  function focusErrors(fields: Record<string, string>) { setErrors(fields); const first = Object.keys(fields)[0]; if (first) document.getElementById(first)?.focus(); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!game || !saved || locked) return;
    const fields = { ...validateShowdownConfig(config), ...Object.fromEntries(Object.entries(validateKeywords(draft.commands)).map(([team, message]) => [`${team}Keyword`, message])) } as Record<string, string>;
    if (Object.keys(fields).length) { focusErrors(fields); setFeedback({ text: 'Check the highlighted fields before saving.', error: true }); return; }
    setFeedback(null);
    try {
      await action('game/configure', { roundId: game.roundId, expectedState: game.state, settingsRevision: draft.revision, config: normalizeConfig(config), commands: draft.commands });
      setEdited(null); setErrors({}); setFeedback({ text: 'Showdown saved for this session. Open the control room to start.' });
    } catch (error) { if (error instanceof ConnectionError && error.fields) focusErrors(error.fields); setFeedback({ text: actionError(error), error: true }); }
  }
  function field(id: string, label: string, value: string, onChange: (value: string) => void, help: string, max: number) {
    return <div className="field"><label htmlFor={id}>{label}</label><input id={id} name={id} value={value} autoComplete="off" maxLength={max} onChange={event => onChange(event.target.value)} aria-invalid={Boolean(errors[id])} aria-describedby={`${id}-${errors[id] ? 'error' : 'help'}`} />
      <p id={`${id}-${errors[id] ? 'error' : 'help'}`} className={errors[id] ? 'field-error' : 'field-help'}>{errors[id] || help}</p></div>;
  }
  return <div className="round-layout showdown-setup">
    <form className="round-form" noValidate aria-busy={busy} onSubmit={event => void submit(event)}>
      {locked && <p className="inline-message warning" role="status">{pending ? 'Commit to the winning choice in the control room before changing this showdown.' : 'This showdown is in progress. Settings are locked until it ends.'} <ButtonLink href="/dashboard" variant="quiet">Open control room</ButtonLink></p>}
      {stale && <div className="inline-message warning" role="alert">Settings changed in another tab. Your edits are still here. <Button type="button" variant="secondary" onClick={() => { setEdited(null); setErrors({}); setFeedback({ text: 'Loaded the latest saved settings.' }); }}>Load saved settings</Button></div>}
      <fieldset className="showdown-edit-fields" disabled={locked || busy || feed !== 'live'}>
        <legend className="sr-only">Showdown settings</legend>
        <div className="form-section">
          <div className="field"><label htmlFor="showdown-template">Start with a template</label><select id="showdown-template" value={config.template} onChange={event => template(event.target.value as ShowdownTemplate)}>{SHOWDOWN_TEMPLATES.map(value => <option key={value} value={value}>{TEMPLATE_COPY[value].label}</option>)}</select><p className="field-help">Choosing a template replaces the fields below.</p></div>
          {field('title', 'Showdown question', config.title, value => change('title', value), 'Shown on your overlay. Up to 60 characters.', 60)}
          <div className="team-fields">{(['coral', 'mint'] as const).map(team => {
            const key = team === 'coral' ? 'coralName' : 'mintName';
            return <div key={team} className={`team-field team-field-${team}`}>
              {field(key, `${team === 'coral' ? 'Coral' : 'Mint'} choice`, config[key], value => change(key, value), 'Up to 20 characters. Use different choices.', 20)}
              {field(`${team}Keyword`, `${team === 'coral' ? 'Coral' : 'Mint'} keyword`, draft.commands[team], value => keyword(team, value), `Chat sends this to pull for ${config[key] || 'this choice'}.`, 21)}
            </div>;
          })}</div>
        </div>
        <div className="form-section">
          <div className="form-section-heading"><h2>After the showdown</h2><p>Choose what the winning result changes.</p></div>
          <div className="field"><label htmlFor="consequenceType">Consequence</label><select id="consequenceType" value={config.consequenceType} onChange={event => change('consequenceType', event.target.value)}><option value="apply_choice">Use the winning choice next</option><option value="custom">Custom action for each choice</option><option value="announce">Announce the result</option></select><p className="field-help">You take the action in your game. Chat Tug Arena records your commitment.</p></div>
          {config.consequenceType === 'custom' && <div className="team-fields">{field('coralAction', 'If Coral wins, I will…', config.coralAction, value => change('coralAction', value), 'Write a specific action you can follow through on.', 120)}{field('mintAction', 'If Mint wins, I will…', config.mintAction, value => change('mintAction', value), 'The result card will show this exact action.', 120)}</div>}
          <fieldset className="duration-field"><legend>Round length</legend><div className="duration-options">{ROUND_DURATIONS.map(seconds => <label key={seconds} className={`duration-option ${config.durationSeconds === seconds ? 'selected' : ''}`}><input type="radio" name="duration" value={seconds} checked={config.durationSeconds === seconds} onChange={() => change('durationSeconds', seconds)} /><strong>{seconds}<span>sec</span></strong>{seconds === 45 && <span className="recommended-duration">Default</span>}</label>)}</div><p className="field-help">A three-second countdown comes first. Reaching a finish line can end the round early.</p></fieldset>
          <div className="field"><label htmlFor="startCondition">Before starting</label><select id="startCondition" value={config.startCondition} onChange={event => change('startCondition', event.target.value)}><option value="connected">Connection ready, then I press Start</option><option value="chat_ready">Require a fresh test command, then I press Start</option></select><p className="field-help">A test command must arrive after this showdown is prepared. Connecting never starts a round automatically.</p></div>
          <details className="advanced-rules"><summary>Advanced fairness settings</summary><div className="field"><label htmlFor="cooldownSeconds">Viewer cooldown</label><select id="cooldownSeconds" value={config.cooldownSeconds} onChange={event => change('cooldownSeconds', Number(event.target.value))}>{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value} {value === 1 ? 'second' : 'seconds'}</option>)}</select><p className="field-help">Repeated participation matters, with diminishing returns. Each viewer stays on one team for the round.</p></div></details>
        </div>
        <div className="form-save"><p>Save these settings for this session.</p><Button type="submit" disabled={stale}>Save showdown</Button></div>
      </fieldset>
      {feed !== 'live' && <p className="inline-message warning" role="status">Waiting for control room updates. Your edits will stay here.</p>}
      {feedback && <div className={`inline-message action-feedback ${feedback.error ? 'error' : 'success'}`} role={feedback.error ? 'alert' : 'status'}>{feedback.text}{!feedback.error && feedback.text.startsWith('Showdown saved') && <ButtonLink href="/dashboard" variant="quiet">Open control room<Icon name="arrow" /></ButtonLink>}</div>}
    </form>
    <aside className="round-preview"><div className="round-preview-heading"><Icon name="screen" /><h2>Draft preview</h2></div><Arena config={{ ...config, coralName: config.coralName || 'Coral choice', mintName: config.mintName || 'Mint choice' }} commands={draft.commands} />
      <div className="consequence-preview"><h3>What you’re committing to</h3>{(['coral', 'mint'] as const).map(team => <div key={team}><strong>{team === 'coral' ? config.coralName : config.mintName} wins</strong><p>{choiceAction(config, team) || 'Add the action for this choice.'}</p></div>)}<p className="control-help">The winner and action are locked when the server finishes the round. A tie or cancelled round has no consequence.</p></div>
    </aside>
  </div>;
}
