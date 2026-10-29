import type { Metadata } from "next";
import { PageHeading } from "@/components/app-shell";
import { Connection } from "@/components/connection";
export const metadata: Metadata = { title: "Twitch connection" };
export default function ConnectionPage() {
  return (
    <>
      <PageHeading
        title="Twitch connection"
        description="Connect your broadcaster account and verify a team command."
      />
      <Connection />
    </>
  );
}
