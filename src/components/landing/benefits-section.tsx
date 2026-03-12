"use client";

import { motion } from "framer-motion";
import { Zap, ShieldCheck, RefreshCw, BarChart3, Globe, Lock } from "lucide-react";

const benefits = [
  {
    icon: <Zap size={20} className="text-primary" />,
    title: "10x Faster Content Creation",
    description: "Generate articles, rewrites, and corrections in seconds instead of hours. Reclaim your time for what matters.",
  },
  {
    icon: <ShieldCheck size={20} className="text-primary" />,
    title: "AI Detection Bypass",
    description: "Our Humanizer ensures your content reads naturally and passes all major AI detection tools effortlessly.",
  },
  {
    icon: <RefreshCw size={20} className="text-primary" />,
    title: "All Tools, One Platform",
    description: "No more juggling between 8 different apps. Everything you need for content creation lives in one place.",
  },
  {
    icon: <BarChart3 size={20} className="text-primary" />,
    title: "Consistent Quality Output",
    description: "AI-powered precision ensures every piece of content meets a high standard — every single time.",
  },
  {
    icon: <Globe size={20} className="text-primary" />,
    title: "Multilingual Support",
    description: "Create and transform content in multiple languages to reach a global audience without barriers.",
  },
  {
    icon: <Lock size={20} className="text-primary" />,
    title: "Secure & Private",
    description: "Your content stays yours. We never store or use your data to train models. Full privacy guaranteed.",
  },
];

export default function BenefitsSection() {
  return (
    <section id="benefits" className="py-28 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-surface/30" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Header */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>Why Erza Studio</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-5 leading-tight">
              Built for speed,{" "}
              <span className="text-gradient-primary">accuracy,</span>
              {" "}and productivity.
            </h2>
            <p className="text-lg text-muted leading-relaxed mb-8">
              Erza Studio is designed to remove friction from your content workflow. Whether you&apos;re writing from scratch or refining existing content, our tools adapt to your needs.
            </p>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground">50K+</div>
                <div className="text-xs text-muted mt-1 uppercase tracking-wide">Active Users</div>
              </div>
              <div className="w-px h-10 bg-border" />
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground">1M+</div>
                <div className="text-xs text-muted mt-1 uppercase tracking-wide">Generated Outputs</div>
              </div>
              <div className="w-px h-10 bg-border" />
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground">4.9★</div>
                <div className="text-xs text-muted mt-1 uppercase tracking-wide">User Rating</div>
              </div>
            </div>
          </motion.div>

          {/* Right: Benefits grid */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.07 }}
                className="flex flex-col gap-3 p-5 rounded-xl border border-border/60 bg-surface/50 hover:border-primary/30 hover:bg-surface/80 transition-all duration-200"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  {benefit.icon}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">
                    {benefit.title}
                  </h3>
                  <p className="text-xs text-muted leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
