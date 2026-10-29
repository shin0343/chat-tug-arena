"use client";
import { useMemo, useState } from "react";
import { CHAT_COMMANDS, DEFAULT_CONFIG, type RoundConfig, type TeamKeywords } from "@chat-tug/contracts";
import { Button, Icon, StatusBadge } from "./ui";
import { GameArt } from "./scene/game-art";
import { previewGame } from "@/lib/scene/preview";

// Previews share the actual crew/ground/grip family, without a clock, participants or server authority.
export function TugScene({ position = 0, compact = false }: { position?: number; compact?: boolean }) {
  const game = useMemo(() => previewGame(DEFAULT_CONFIG, position), [position]);
  return <GameArt game={game} running={false} compact={compact} />;
}
export function Arena({
  config = DEFAULT_CONFIG,
  interactive = false,
  compact = false,
  commands = CHAT_COMMANDS,
}: {
  config?: Readonly<RoundConfig>;
  interactive?: boolean;
  compact?: boolean;
  commands?: Readonly<TeamKeywords>;
}) {
  const [position, setPosition] = useState(0);
  const [lastPull, setLastPull] = useState(
    "Choose a crew. Give the rope a pull.",
  );
  function pull(direction: -1 | 1) {
    setPosition((p) => Math.max(-1, Math.min(1, p + direction * 0.16)));
    setLastPull(
      direction < 0
        ? "Coral pulls left. This is a local demo."
        : "Mint pulls right. This is a local demo.",
    );
  }
  const time = `${String(Math.floor(config.durationSeconds / 60)).padStart(2, "0")}:${String(config.durationSeconds % 60).padStart(2, "0")}`;
  return (
    <div className={`arena ${interactive ? "arena-interactive" : ""}`}>
      <div className="arena-topline">
        <span className="arena-brand">The tug yard</span>
        <StatusBadge tone="demo">
          {interactive ? "Interactive demo" : "Round preview"}
        </StatusBadge>
      </div>
      <div className="scoreboard">
        <div className="team-name team-coral">
          <span className="team-label">Team Coral</span>
          <strong>{config.coralName}</strong>
          <code>{commands.coral}</code>
        </div>
        <div className="game-clock">
          <span>{interactive ? "Sample round" : "Round length"}</span>
          <strong>{time}</strong>
        </div>
        <div className="team-name team-mint">
          <span className="team-label">Team Mint</span>
          <strong>{config.mintName}</strong>
          <code>{commands.mint}</code>
        </div>
      </div>
      <TugScene position={position} compact={compact} />
      {interactive ? (
        <div className="demo-controls">
          <div className="demo-button-row">
            <Button variant="coral" onClick={() => pull(-1)}>
              <span aria-hidden="true">←</span> Pull for Coral
            </Button>
            <Button
              variant="quiet"
              aria-label="Reset demo rope"
              onClick={() => {
                setPosition(0);
                setLastPull("Rope reset to the center.");
              }}
            >
              <Icon name="reset" />
            </Button>
            <Button variant="mint" onClick={() => pull(1)}>
              Pull for Mint <span aria-hidden="true">→</span>
            </Button>
          </div>
          <p role="status" className="demo-caption">
            {lastPull}
          </p>
          <span className="demo-disclosure">
            Demo only. No Twitch chat is connected.
          </span>
        </div>
      ) : (
        <div className="arena-idle">
          <Icon name="clock" />
          <span>Round layout preview. Prepare a round in the control room.</span>
        </div>
      )}
    </div>
  );
}
