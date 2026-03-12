"use client";

import { Link } from "@/i18n/routing";
import { Sparkles } from "lucide-react";

export default function LandingFooter() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    Product: [
      { label: "Features", href: "#" },
      { label: "Pricing", href: "#" },
      { label: "Roadmap", href: "#" },
      { label: "Release Notes", href: "/#" },
    ],
    Resources: [
      { label: "Blog", href: "#" },
      { label: "Help Center", href: "#" },
      { label: "Contact", href: "#" },
    ],
    Legal: [
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
    ],
  };

  return (
    <footer className="border-t border-border bg-surface/50">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          <div className="col-span-2 md:col-span-1">
            <Link
              href="/"
              className="flex items-center gap-3 no-underline mb-4"
            >
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <Sparkles size={20} className="text-white" />
              </div>
              <span className="text-lg font-bold text-foreground tracking-tight">
                Erza <span className="text-primary">Studio</span>
              </span>
            </Link>
            <p className="text-sm text-muted leading-relaxed">
              The all-in-one AI studio for creators, writers, and developers.
            </p>
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-sm font-semibold text-foreground mb-4">
                {title}
              </h4>
              <ul className="space-y-2.5 list-none p-0 m-0">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted hover:text-foreground transition-colors no-underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted" suppressHydrationWarning>
            © {currentYear} Erza Studio. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
