import type { Metadata } from "next";
import { PageHeading } from "@/components/app-shell";
import { OverlaySetup } from "@/components/overlay-setup";
export const metadata: Metadata = { title: "OBS overlay" };
export default function OverlaySetupPage() {
  return (
    <>
      <PageHeading
        title="OBS overlay setup"
        description="Copy your source URL, add it to OBS and check the live composition here."
      />
      <OverlaySetup />
    </>
  );
}
