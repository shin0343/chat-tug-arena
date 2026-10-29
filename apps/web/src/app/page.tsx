import { Arena } from "@/components/arena";
import { Brand, ButtonLink, Icon } from "@/components/ui";
export default function Home() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <Brand />
        <nav aria-label="Main navigation">
          <a href="#how-it-plays">How it plays</a>
          <LinkToRoom />
          <ButtonLink href="/setup">
            Set up your arena
            <Icon name="arrow" />
          </ButtonLink>
        </nav>
      </header>
      <main id="main-content">
        <section className="landing-hero">
          <div className="hero-copy">
            <div className="hero-context">
              <span className="tiny-flag" aria-hidden="true" />A tug-of-war for
              Twitch chat
            </div>
            <h1>
              ONE CHAT.
              <br />
              TWO SIDES.
              <br />
              ALL IN.
            </h1>
            <p>
              Let chat choose your next move.
              <br className="desktop-break" /> Pick two options. Viewers pull for
              the one they want you to play.
            </p>
            <div className="hero-actions">
              <ButtonLink href="/setup">
                Set up your arena
                <Icon name="arrow" />
              </ButtonLink>
              <a href="#try-it" className="text-link">
                Give it a pull
                <Icon name="chevron" />
              </a>
            </div>
            <div className="hero-note">
              <Icon name="chat" />
              <span>Your next character, loadout or community challenge.</span>
            </div>
          </div>
          <div className="hero-preview" id="try-it">
            <div className="preview-window-bar">
              <span className="window-label">
                <Icon name="screen" />
                Try the tug-of-war
              </span>
              <span>Preview</span>
            </div>
            <Arena interactive />
            <div className="preview-window-footer">
              <span className="rope-mini" aria-hidden="true" />
              <span>
                A crew that pulls together can turn the round around.
              </span>
            </div>
          </div>
        </section>
        <section id="how-it-plays" className="how-it-plays">
          <div className="how-heading">
            <h2>From chat to showdown.</h2>
            <p>A simple setup. A very divided chat.</p>
          </div>
          <ol className="how-steps">
            <li>
              <span className="step-number">1</span>
              <div>
                <h3>Connect your channel</h3>
                <p>Give your arena a home on Twitch.</p>
              </div>
            </li>
            <li>
              <span className="step-number">2</span>
              <div>
                <h3>Give chat two choices</h3>
                <p>Set the question, keywords and what you’ll do with the winner.</p>
              </div>
            </li>
            <li>
              <span className="step-number">3</span>
              <div>
                <h3>Play the winning choice</h3>
                <p>
                  Add the OBS overlay, start the round and commit to the choice chat wins.
                </p>
              </div>
            </li>
          </ol>
          <p className="foundation-note">
            No Twitch connection yet? Save a showdown in the control room and rehearse it with clearly labeled simulated viewers.
          </p>
        </section>
        <section className="landing-bottom">
          <div>
            <h2>Your chat already has opinions.</h2>
            <p>Give them a rope.</p>
          </div>
          <ButtonLink href="/dashboard" variant="secondary">
            Explore the control room
            <Icon name="arrow" />
          </ButtonLink>
        </section>
      </main>
      <footer className="landing-footer">
        <Brand compact />
        <span>Made for shared live moments.</span>
        <span>Codex x TwitchCon Hackathon 2026 project</span>
      </footer>
    </div>
  );
}
function LinkToRoom() {
  return (
    <ButtonLink href="/dashboard" variant="quiet" className="nav-room-link">
      Control room
    </ButtonLink>
  );
}
