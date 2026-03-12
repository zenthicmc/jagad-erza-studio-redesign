"use client";

import { motion } from "framer-motion";
import { Sparkles, Wand2, Check, RefreshCw, ArrowRight } from "lucide-react";
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
            A workspace built for{" "}
            <span className="text-gradient-primary">modern creators.</span>
          </h2>
          <p className="text-lg text-muted max-w-xl mx-auto leading-relaxed">
            Clean, fast, and intuitive. Every tool is designed to get out of your way and let you focus on creating.
          </p>
        </motion.div>

        {/* Mock UI Preview */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative max-w-5xl mx-auto"
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
                  <span className="text-xs text-muted">app.erzastudio.com/ai-tools/humanize</span>
                </div>
              </div>
            </div>

            {/* App toolbar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border" style={{ background: 'var(--surface)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(145,203,10,0.15)', border: '1px solid rgba(145,203,10,0.25)' }}>
                  <Wand2 size={14} className="text-primary" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground leading-tight">Humanizer</div>
                  <div className="text-[10px] text-muted">Transform AI text to human-sounding content</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-7 px-3 rounded-md border border-border text-xs text-muted flex items-center" style={{ background: 'var(--bg)' }}>Add to Collection</div>
                <div className="h-7 px-3 rounded-md text-xs font-medium flex items-center gap-1.5" style={{ background: 'var(--primary, #91CB0A)', color: 'var(--bg)' }}>
                  <Sparkles size={11} />
                  Humanize
                </div>
              </div>
            </div>

            {/* Split panel */}
            <div className="flex min-h-[320px]">
              {/* Input panel */}
              <div className="flex-1 flex flex-col border-r border-border">
                <div className="flex items-center gap-2 px-4 h-10 border-b border-border" style={{ background: 'var(--bg)' }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-xs font-semibold text-foreground">Input</span>
                </div>
                <div className="flex-1 p-4">
                  <p className="text-sm text-muted leading-relaxed">
                    <span className="text-foreground">The implementation of artificial intelligence in modern workflows has demonstrated significant improvements in operational efficiency. </span>
                    Organizations that have adopted AI-driven solutions report substantial reductions in time-to-completion for routine tasks...
                  </p>
                </div>
                <div className="flex items-center justify-between px-4 h-12 border-t border-border" style={{ background: 'var(--bg)' }}>
                  <span className="text-xs text-muted">47 words</span>
                  <div className="flex items-center gap-2">
                    <div className="h-7 px-3 rounded-md border border-border text-xs text-muted flex items-center" style={{ background: 'var(--surface)' }}>Upload File</div>
                    <div className="h-7 px-3 rounded-md text-xs font-medium flex items-center gap-1" style={{ background: 'var(--primary, #91CB0A)', color: 'var(--bg)' }}>
                      <Sparkles size={10} /> Humanize
                    </div>
                  </div>
                </div>
              </div>

              {/* Output panel */}
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between px-4 h-10 border-b border-border" style={{ background: 'var(--bg)' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted" />
                    <span className="text-xs font-semibold text-foreground">Output</span>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(145,203,10,0.1)', color: 'var(--primary, #91CB0A)' }}>Ready</span>
                </div>
                <div className="flex-1 p-4 relative">
                  {/* Processing overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <RefreshCw size={24} className="text-primary animate-spin" />
                    <p className="text-xs text-muted">Humanizing your content...</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="h-1 rounded-full bg-primary/40"
                          style={{ width: `${[60, 100, 80, 40, 70][i]}%`, maxWidth: 40 + i * 10 }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between px-4 h-12 border-t border-border" style={{ background: 'var(--bg)' }}>
                  <div className="flex items-center gap-1.5">
                    <Check size={12} className="text-primary" />
                    <span className="text-xs text-muted">Human score: <span className="text-foreground font-medium">94%</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-7 px-3 rounded-md border border-border text-xs text-muted flex items-center" style={{ background: 'var(--surface)' }}>Copy</div>
                    <div className="h-7 px-3 rounded-md border border-border text-xs text-muted flex items-center" style={{ background: 'var(--surface)' }}>Download</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-12 text-center"
        >
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-primary/30 bg-primary/5 text-primary text-sm font-medium hover:bg-primary/10 transition-colors no-underline group"
          >
            Try it yourself — it&apos;s free
            <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
