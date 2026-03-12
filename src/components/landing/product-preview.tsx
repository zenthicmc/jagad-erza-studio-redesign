"use client";

import { motion } from "framer-motion";
import {
  Sparkles,
  FileText,
  ArrowRight,
  Bold,
  Italic,
  List,
  AlignLeft,
  Image,
  Link2,
  Undo2,
  Redo2,
  MessageSquare,
  ChevronRight,
  PenLine,
  Clock,
  BarChart2,
} from "lucide-react";
import Link from "next/link";

export default function ProductPreview() {
  return (
    <section id="preview" className="py-28 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-surface/20" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-primary/4 rounded-full blur-[160px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-medium mb-6">
            <Sparkles size={13} />
            <span>See It In Action</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-5">
            Write smarter with{" "}
            <span className="text-gradient-primary">AI Article Editor.</span>
          </h2>
          <p className="text-lg text-muted max-w-xl mx-auto leading-relaxed">
            Our core Article feature combines a powerful rich-text editor with an AI writing assistant — so you can draft, refine, and publish faster than ever.
          </p>
        </motion.div>

        {/* Mock UI Preview */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative max-w-6xl mx-auto"
        >
          {/* Outer glow */}
          <div className="absolute -inset-4 bg-primary/5 rounded-3xl blur-2xl" />

          {/* Browser chrome */}
          <div className="relative rounded-2xl border border-border/80 overflow-hidden shadow-2xl" style={{ background: 'var(--bg)' }}>
            {/* Browser bar */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border" style={{ background: 'var(--surface)' }}>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
              </div>
              <div className="flex-1 mx-4">
                <div className="h-6 rounded-md border border-border px-3 flex items-center" style={{ background: 'var(--bg)' }}>
                  <span className="text-xs text-muted">app.erzastudio.com/article/new</span>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <div className="h-6 px-3 rounded-md border border-border text-[10px] text-muted flex items-center" style={{ background: 'var(--bg)' }}>Save Draft</div>
                <div className="h-6 px-3 rounded-md text-[10px] font-medium flex items-center gap-1" style={{ background: 'var(--primary, #91CB0A)', color: 'var(--bg)' }}>
                  Publish
                </div>
              </div>
            </div>

            {/* App layout: sidebar + editor + AI panel */}
            <div className="flex" style={{ minHeight: 420 }}>

              {/* Left sidebar: article list */}
              <div className="hidden lg:flex w-52 flex-col border-r border-border flex-shrink-0" style={{ background: 'var(--surface)' }}>
                <div className="flex items-center justify-between px-4 h-10 border-b border-border">
                  <span className="text-xs font-semibold text-foreground">My Articles</span>
                  <PenLine size={12} className="text-primary" />
                </div>
                <div className="flex-1 py-2 overflow-hidden">
                  {[
                    { title: "10 AI Writing Tips for...", active: true, time: "Now" },
                    { title: "The Future of Content...", active: false, time: "2h ago" },
                    { title: "How to Use Humanizer...", active: false, time: "Yesterday" },
                    { title: "SEO Best Practices 2025", active: false, time: "3d ago" },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className={`px-3 py-2.5 mx-2 rounded-lg mb-1 cursor-pointer transition-colors ${item.active ? 'bg-primary/10 border border-primary/20' : 'hover:bg-surface-hover'}`}
                    >
                      <div className={`text-[11px] font-medium truncate ${item.active ? 'text-primary' : 'text-foreground'}`}>
                        {item.title}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock size={9} className="text-muted" />
                        <span className="text-[9px] text-muted">{item.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-3 py-3 border-t border-border">
                  <div className="w-full h-7 rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-medium" style={{ background: 'rgba(145,203,10,0.1)', color: 'var(--primary, #91CB0A)', border: '1px solid rgba(145,203,10,0.2)' }}>
                    <PenLine size={11} />
                    New Article
                  </div>
                </div>
              </div>

              {/* Main editor */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* Toolbar */}
                <div className="flex items-center gap-1 px-4 h-10 border-b border-border overflow-x-auto" style={{ background: 'var(--surface)' }}>
                  <button className="w-7 h-7 rounded flex items-center justify-center hover:bg-surface-hover transition-colors flex-shrink-0">
                    <Undo2 size={13} className="text-muted" />
                  </button>
                  <button className="w-7 h-7 rounded flex items-center justify-center hover:bg-surface-hover transition-colors flex-shrink-0">
                    <Redo2 size={13} className="text-muted" />
                  </button>
                  <div className="w-px h-4 bg-border mx-1 flex-shrink-0" />
                  <button className="w-7 h-7 rounded flex items-center justify-center bg-primary/10 flex-shrink-0">
                    <Bold size={13} className="text-primary" />
                  </button>
                  <button className="w-7 h-7 rounded flex items-center justify-center hover:bg-surface-hover transition-colors flex-shrink-0">
                    <Italic size={13} className="text-muted" />
                  </button>
                  <button className="w-7 h-7 rounded flex items-center justify-center hover:bg-surface-hover transition-colors flex-shrink-0">
                    <List size={13} className="text-muted" />
                  </button>
                  <button className="w-7 h-7 rounded flex items-center justify-center hover:bg-surface-hover transition-colors flex-shrink-0">
                    <AlignLeft size={13} className="text-muted" />
                  </button>
                  <button className="w-7 h-7 rounded flex items-center justify-center hover:bg-surface-hover transition-colors flex-shrink-0">
                    <Link2 size={13} className="text-muted" />
                  </button>
                  <button className="w-7 h-7 rounded flex items-center justify-center hover:bg-surface-hover transition-colors flex-shrink-0">
                    <Image size={13} className="text-muted" />
                  </button>
                  <div className="flex-1" />
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <BarChart2 size={11} className="text-muted" />
                    <span className="text-[10px] text-muted">342 words</span>
                  </div>
                </div>

                {/* Editor content */}
                <div className="flex-1 p-6 overflow-hidden">
                  {/* Article title */}
                  <div className="text-xl font-bold text-foreground mb-4 leading-tight">
                    10 AI Writing Tips for Content Creators in 2025
                  </div>

                  {/* Article body */}
                  <div className="space-y-3 text-sm text-muted leading-relaxed">
                    <p>
                      <span className="text-foreground">Artificial intelligence has fundamentally changed how content creators approach their craft.</span>{" "}
                      From ideation to final polish, AI tools now assist at every stage of the writing process — helping creators produce more content, faster, without sacrificing quality.
                    </p>
                    <p>
                      In this guide, we&apos;ll explore the most effective strategies for integrating AI into your workflow, covering everything from prompt engineering to humanizing AI-generated text for maximum authenticity.
                    </p>
                    {/* Highlighted/selected text simulation */}
                    <p>
                      <span className="bg-primary/15 text-foreground rounded px-0.5">The key to great AI-assisted writing is knowing when to let the AI lead and when to take control yourself.</span>{" "}
                      Understanding this balance is what separates good content from truly exceptional work.
                    </p>
                  </div>

                  {/* AI suggestion popup */}
                  <div className="mt-4 p-3 rounded-xl border border-primary/25 flex items-start gap-3" style={{ background: 'rgba(145,203,10,0.06)' }}>
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(145,203,10,0.15)' }}>
                      <Sparkles size={12} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-semibold text-primary mb-1">AI Suggestion</div>
                      <p className="text-xs text-muted leading-relaxed">
                        Consider adding a concrete example here — such as &ldquo;For instance, using AI to generate a first draft saves 60% of writing time...&rdquo;
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <button className="text-[10px] font-medium px-2 py-1 rounded-md" style={{ background: 'var(--primary, #91CB0A)', color: 'var(--bg)' }}>Apply</button>
                        <button className="text-[10px] text-muted px-2 py-1 rounded-md border border-border" style={{ background: 'var(--surface)' }}>Dismiss</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer bar */}
                <div className="flex items-center justify-between px-4 h-10 border-t border-border" style={{ background: 'var(--surface)' }}>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-muted">Auto-saved 2s ago</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-6 px-2.5 rounded-md border border-border text-[10px] text-muted flex items-center gap-1" style={{ background: 'var(--bg)' }}>
                      <FileText size={9} />
                      Export
                    </div>
                    <div className="h-6 px-2.5 rounded-md text-[10px] font-medium flex items-center gap-1" style={{ background: 'var(--primary, #91CB0A)', color: 'var(--bg)' }}>
                      <Sparkles size={9} />
                      AI Assist
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: AI Chat panel */}
              <div className="hidden xl:flex w-64 flex-col border-l border-border flex-shrink-0" style={{ background: 'var(--surface)' }}>
                <div className="flex items-center gap-2 px-4 h-10 border-b border-border">
                  <MessageSquare size={13} className="text-primary" />
                  <span className="text-xs font-semibold text-foreground">AI Assistant</span>
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                </div>
                <div className="flex-1 p-3 space-y-3 overflow-hidden">
                  {/* AI message */}
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(145,203,10,0.15)' }}>
                      <Sparkles size={10} className="text-primary" />
                    </div>
                    <div className="flex-1 p-2.5 rounded-xl rounded-tl-sm text-[11px] text-foreground leading-relaxed" style={{ background: 'var(--bg)', border: '1px solid var(--border-color)' }}>
                      Your intro is strong! Want me to suggest a compelling subheading for section 2?
                    </div>
                  </div>
                  {/* User message */}
                  <div className="flex gap-2 justify-end">
                    <div className="p-2.5 rounded-xl rounded-tr-sm text-[11px] text-bg leading-relaxed max-w-[85%]" style={{ background: 'var(--primary, #91CB0A)' }}>
                      Yes, and make it SEO-friendly
                    </div>
                  </div>
                  {/* AI response */}
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(145,203,10,0.15)' }}>
                      <Sparkles size={10} className="text-primary" />
                    </div>
                    <div className="flex-1 p-2.5 rounded-xl rounded-tl-sm text-[11px] text-foreground leading-relaxed" style={{ background: 'var(--bg)', border: '1px solid var(--border-color)' }}>
                      Try: &ldquo;How AI Writing Tools Are Transforming Content Strategy in 2025&rdquo; — it targets high-volume keywords naturally.
                      <div className="flex items-center gap-1.5 mt-2">
                        <button className="text-[9px] font-medium px-1.5 py-0.5 rounded" style={{ background: 'var(--primary, #91CB0A)', color: 'var(--bg)' }}>Insert</button>
                        <button className="text-[9px] text-muted px-1.5 py-0.5 rounded border border-border" style={{ background: 'var(--surface)' }}>Regenerate</button>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Chat input */}
                <div className="px-3 py-3 border-t border-border">
                  <div className="flex items-center gap-2 h-8 px-3 rounded-lg border border-border" style={{ background: 'var(--bg)' }}>
                    <span className="text-[11px] text-muted flex-1">Ask AI anything...</span>
                    <ChevronRight size={12} className="text-primary" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feature highlights below preview */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-6"
        >
          {[
            { icon: <PenLine size={13} className="text-primary" />, label: "Rich-text editor" },
            { icon: <Sparkles size={13} className="text-primary" />, label: "Inline AI suggestions" },
            { icon: <MessageSquare size={13} className="text-primary" />, label: "AI chat assistant" },
            { icon: <FileText size={13} className="text-primary" />, label: "Export to PDF / DOCX" },
          ].map((f) => (
            <div key={f.label} className="flex items-center gap-2 text-sm text-muted">
              {f.icon}
              <span>{f.label}</span>
            </div>
          ))}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 text-center"
        >
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-primary/30 bg-primary/5 text-primary text-sm font-medium hover:bg-primary/10 transition-colors no-underline group"
          >
            Start writing with AI — it&apos;s free
            <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
