import type { Metadata } from "next";
import { Brand, ButtonLink } from "@/components/ui";
import { Connection } from "@/components/connection";
import { ConnectionProvider } from "@/lib/connection-store";
export const metadata: Metadata = { title: "Set up your arena" };
export default function SetupPage() {
  return (
    <div className="setup-page">
      <header className="setup-nav">
        <Brand />
        <ButtonLink href="/dashboard" variant="quiet">
          Explore control room
        </ButtonLink>
      </header>
      <main id="main-content" className="setup-main">
        <div className="setup-intro">
          <span className="setup-progress">Channel → Round → Overlay</span>
          <h1>Set up your Twitch arena.</h1>
          <p>
            Connect your channel, choose your commands, and check your first chat input.
          </p>
        </div>
        <ConnectionProvider><Connection onboarding /></ConnectionProvider>
      </main>
    </div>
  );
}
