"use client";

import { Link } from "@/i18n/routing";
import { Sparkles, Twitter, Github, Linkedin, Mail } from "lucide-react";

export default function LandingFooter() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    Product: [
      { label: "Features", href: "#features" },
      { label: "How It Works", href: "#how-it-works" },
      { label: "Pricing", href: "#pricing" },
      { label: "Roadmap", href: "#" },
      { label: "Release Notes", href: "#" },
    ],
    Tools: [
      { label: "Writing Assistant", href: "/signup" },
      { label: "Humanizer", href: "/signup" },
      { label: "Paraphraser", href: "/signup" },
      { label: "Grammar Checker", href: "/signup" },
      { label: "AI Detector", href: "/signup" },
    ],
    Resources: [
      { label: "Blog", href: "#" },
      { label: "Help Center", href: "#" },
      { label: "Contact", href: "#" },
      { label: "Waiting List", href: "/waiting-list" },
    ],
    Legal: [
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
      { label: "Cookie Policy", href: "#" },
    ],
  };

  const socialLinks = [
    { icon: <Twitter size={16} />, href: "#", label: "Twitter" },
    { icon: <Github size={16} />, href: "#", label: "GitHub" },
    { icon: <Linkedin size={16} />, href: "#", label: "LinkedIn" },
    { icon: <Mail size={16} />, href: "#", label: "Email" },
  ];

  return (
    <footer className="border-t border-border" style={{ background: 'var(--surface)' }}>
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10 mb-14">
          {/* Brand */}
          <div className="col-span-2 md:col-span-2">
            <Link
              href="/"
              className="flex items-center gap-3 no-underline mb-5"
            >
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(145,203,10,0.25)]">
                <Sparkles size={18} className="text-white" />
              </div>
              <span className="text-lg font-bold text-foreground tracking-tight">
                Erza <span className="text-primary">Studio</span>
              </span>
            </Link>
            <p className="text-sm text-muted leading-relaxed mb-6 max-w-[220px]">
              The all-in-one AI studio for creators, writers, and professionals.
            </p>

            {/* Social links */}
            <div className="flex items-center gap-2">
              {socialLinks.map((social) => (
                <Link
                  key={social.label}
                  href={social.href}
                  className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted hover:text-foreground hover:border-primary/40 transition-all no-underline"
                  style={{ background: 'var(--bg)' }}
                  aria-label={social.label}
                >
                  {social.icon}
                </Link>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title} className="col-span-1">
              <h4 className="text-xs font-semibold text-foreground mb-4 uppercase tracking-wider">
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

        {/* Bottom bar */}
        <div className="border-t border-border pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted" suppressHydrationWarning>
            © {currentYear} Erza Studio. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-xs text-muted">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
