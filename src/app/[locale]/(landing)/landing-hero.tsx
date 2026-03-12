"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";

interface LandingHeroProps {
  title: string;
  subtitle: string;
  ctaPrimary: string;
  ctaSecondary: string;
  ctaAuthenticated: string;
}

export default function LandingHero({
  title,
  subtitle,
  ctaPrimary,
  ctaSecondary,
  ctaAuthenticated,
}: LandingHeroProps) {
  const { isAuthenticated, isLoading } = useAuth();

  const titleWords = title.split(" ");
  const firstWord = titleWords[0];
  const restOfTitle = titleWords.slice(1).join(" ");

  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 }
    }
  };

  const itemUp = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const } }
  };

  return (
    <section className="relative overflow-hidden min-h-[90vh] flex flex-col justify-center items-center pt-24 pb-16">
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="absolute top-[20%] w-[80vw] h-[60vh] bg-primary/5 rounded-full blur-[150px] animate-[pulseGlow_8s_ease-in-out_infinite]" />
        <div className="absolute top-[30%] w-[600px] h-[400px] bg-primary/10 rounded-full blur-[120px] mix-blend-screen" />

        <div className="absolute -top-[10%] -left-[10%] w-[500px] h-[500px] bg-secondary/15 rounded-full blur-[160px]" />
        <div className="absolute top-[40%] -right-[10%] w-[600px] h-[600px] bg-primary-dark/10 rounded-full blur-[180px]" />

        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_100%)]" />
      </div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="relative z-10 max-w-6xl mx-auto px-6 text-center flex flex-col items-center"
      >

        <motion.div variants={itemUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-md text-primary text-sm font-medium mb-8 shadow-[0_0_15px_rgba(177,243,21,0.1)]">
          <Sparkles size={14} className="text-primary animate-pulse" />
          <span>The Next Generation AI Assistant</span>
        </motion.div>
        <motion.h1 variants={itemUp} className="text-6xl md:text-8xl font-extrabold tracking-tighter leading-[1.05] mb-8">
          <span className="text-gradient">
            {title}
          </span>
          <br className="hidden md:block" />
          <span className="text-gradient-primary mt-2 block">Without limits.</span>
        </motion.h1>

        <motion.p variants={itemUp} className="text-xl md:text-2xl text-muted max-w-3xl mx-auto mb-12 leading-relaxed font-light">
          {subtitle}
        </motion.p>

        <motion.div variants={itemUp} className="flex flex-col sm:flex-row items-center justify-center gap-5 w-full sm:w-auto">
          <div className="relative group w-full sm:w-auto">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-primary-dark rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
            <Link
              href={!isLoading && isAuthenticated ? "/article" : "/signup"}
              className="relative flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 text-lg font-semibold text-bg rounded-2xl bg-primary hover:bg-primary-light transition-all no-underline overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                {!isLoading && isAuthenticated ? ctaAuthenticated : ctaPrimary}
                <ArrowRight
                  size={20}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </span>
            </Link>
          </div>

          <button className="group flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 text-lg font-medium text-fg rounded-2xl border border-border/50 bg-surface/30 backdrop-blur-sm hover:bg-surface hover:border-border transition-all">
            {ctaSecondary}
          </button>
        </motion.div>

        <motion.div variants={itemUp} className="mt-24 grid grid-cols-2 lg:grid-cols-4 gap-8 w-full max-w-4xl mx-auto border-t border-border/40 pt-12">
          {[
            { value: "50K+", label: "Active Users" },
            { value: "1M+", label: "Generated Outputs" },
            { value: "99.9%", label: "Uptime" },
            { value: "4.9/5", label: "User Rating" },
          ].map((stat, i) => (
            <div key={stat.label} className="flex flex-col items-center justify-center text-center">
              <div className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-fg to-muted">
                {stat.value}
              </div>
              <div className="text-sm font-medium text-muted mt-2 tracking-wide uppercase">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
