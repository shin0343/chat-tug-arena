import type { Metadata } from "next";
import { BroadcastOverlay } from "@/components/broadcast-overlay";
export const metadata: Metadata = {
  title: "Arena overlay",
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};
export default async function OverlayPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const preview = (await searchParams).preview === "1";
  return <BroadcastOverlay preview={preview} />;
}
