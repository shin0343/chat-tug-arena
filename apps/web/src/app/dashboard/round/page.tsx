"use client";
import { PageHeading } from "@/components/app-shell";
import { RoundForm } from "@/components/round-form";
export default function RoundPage() {
  return (
    <>
      <PageHeading
        title="Showdown setup"
        description="Set the question, two choices and what you’ll do with the winner."
      />
      <RoundForm />
    </>
  );
}
