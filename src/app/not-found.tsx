import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function RootNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface border border-border mb-6">
          <FileQuestion className="w-8 h-8 text-muted" />
        </div>
        <h1 className="text-4xl font-bold text-foreground mb-2">404</h1>
        <p className="text-muted mb-8">
          This page could not be found. Check the URL or head back home.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground px-6 py-3 font-medium hover:bg-primary-dark transition-colors no-underline"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
