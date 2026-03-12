import { CreditCard } from "lucide-react";

export default function PlansBillingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <div className="p-4 rounded-2xl bg-primary/10">
        <CreditCard size={40} className="text-primary" />
      </div>
      <div>
        <h1 className="text-xl font-bold text-foreground mb-1">
          Plans & Billing
        </h1>
        <p className="text-sm text-muted max-w-sm">
          This feature is coming soon. You&apos;ll be able to manage your
          subscription and billing details here.
        </p>
      </div>
    </div>
  );
}
