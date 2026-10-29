import { Brand, ButtonLink } from "@/components/ui";
export default function NotFound() {
  return (
    <main id="main-content" className="not-found">
      <Brand />
      <h1>This arena is off the map.</h1>
      <p>That page isn’t here. Head back to your control room.</p>
      <ButtonLink href="/dashboard">Open control room</ButtonLink>
    </main>
  );
}
