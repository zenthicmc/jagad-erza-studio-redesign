import type { Metadata } from "next";
import WaitingListPage from "@/components/landing/waiting-list-page";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Join the Waiting List — Erza Studio",
    description:
      "Be among the first to access Erza Studio. Join our waiting list for early access, exclusive founding member pricing, and priority support.",
  };
}

export default function WaitingList() {
  return <WaitingListPage />;
}
