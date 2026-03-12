"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, Users, Star, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

export default function CtaSection() {
  const tLanding = useTranslations("landing");
  const t = useTranslations("landing.cta");

  return (
    <section id="contact" className="py-32 relative overflow-hidden">
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
        <div className="w-[900px] h-[500px] bg-primary/8 rounded-full blur-[180px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-3xl border border-primary/20 overflow-hidden"
          style={{ background: 'var(--surface)' }}
        >
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_10%,transparent_100%)] pointer-events-none" />

          {/* Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-primary/10 rounded-full blur-[80px] pointer-events-none" />

          <div className="relative z-10 px-8 py-16 md:px-20 md:py-20 text-center flex flex-col items-center">
            {/* Icon */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(145,203,10,0.15)]"
            >
              <Sparkles className="text-primary" size={28} />
            </motion.div>

            {/* Headline */}
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.25, duration: 0.6 }}
              className="text-4xl md:text-5xl font-bold tracking-tight mb-5 text-foreground max-w-2xl mx-auto leading-tight"
            >
              {t("title")}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-lg text-muted max-w-xl mx-auto mb-10 leading-relaxed"
            >
              {t("description")}
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.35, duration: 0.6 }}
              className="flex flex-col sm:flex-row items-center gap-4"
            >
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-primary-light rounded-xl blur opacity-40 group-hover:opacity-70 transition duration-500" />
                <Link
                  href="/signup"
                  className="relative flex items-center gap-2 px-8 py-4 bg-primary text-bg rounded-xl font-semibold text-base hover:bg-primary-light transition-colors no-underline"
                >
                  {tLanding("getStarted")}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              <Link
                href="/waiting-list"
                className="flex items-center gap-2 px-8 py-4 rounded-xl border border-border text-foreground font-medium text-base hover:border-primary/40 hover:bg-surface-hover transition-all no-underline"
                style={{ background: 'var(--bg)' }}
              >
                <Users size={16} className="text-muted" />
                Join Waiting List
              </Link>
            </motion.div>

            {/* Social proof strip */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="flex flex-wrap items-center justify-center gap-6 mt-10 pt-10 border-t border-border/60 w-full"
            >
              <div className="flex items-center gap-2 text-sm text-muted">
                <Zap size={14} className="text-primary" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted">
                <Users size={14} className="text-primary" />
                <span>50,000+ active users</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted">
                <Star size={14} className="text-primary fill-primary" />
                <span>4.9/5 rating</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
