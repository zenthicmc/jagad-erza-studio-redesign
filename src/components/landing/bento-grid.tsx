"use client";

import {
  Sparkles,
  FileText,
  MessageSquare,
  Wand2,
  Repeat2,
  SpellCheck,
  ScanSearch,
  FolderOpen,
  PenLine,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import Link from "next/link";

export default function BentoGrid() {
  const t = useTranslations("landing.bento");

  const features = [
    {
      title: "Writing Assistant",
      description: "Generate high-quality articles, blog posts, and marketing copy in seconds with AI-powered writing.",
      icon: <PenLine size={22} className="text-primary" />,
      href: "/signup",
    },
    {
      title: "Article Manager",
      description: "Organize, edit, and publish your articles seamlessly in one centralized workspace.",
      icon: <FileText size={22} className="text-primary" />,
      href: "/signup",
    },
    {
      title: "AI Chat",
      description: "Chat with an advanced AI assistant that understands context and helps you brainstorm ideas.",
      icon: <MessageSquare size={22} className="text-primary" />,
      href: "/signup",
    },
    {
      title: "Humanizer",
      description: "Transform AI-generated text into natural, human-sounding content that bypasses AI detectors.",
      icon: <Wand2 size={22} className="text-primary" />,
      href: "/signup",
    },
    {
      title: "Paraphraser",
      description: "Rewrite and rephrase any text while preserving the original meaning with multiple tone options.",
      icon: <Repeat2 size={22} className="text-primary" />,
      href: "/signup",
    },
    {
      title: "Grammar Checker",
      description: "Detect and fix grammar, spelling, and punctuation errors instantly with AI precision.",
      icon: <SpellCheck size={22} className="text-primary" />,
      href: "/signup",
    },
    {
      title: "AI Detector",
      description: "Analyze any text and determine the probability of it being AI-generated or human-written.",
      icon: <ScanSearch size={22} className="text-primary" />,
      href: "/signup",
    },
    {
      title: "Collection",
      description: "Save, organize, and manage all your generated content in smart folders for easy access.",
      icon: <FolderOpen size={22} className="text-primary" />,
      href: "/signup",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
  };

  return (
    <section id="features" className="py-28 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-primary/4 rounded-full blur-[180px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-medium mb-6">
            <Sparkles size={13} className="text-primary" />
            <span>All-in-One Toolkit</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-5">
            Everything you need,{" "}
            <span className="text-gradient-primary">in one place.</span>
          </h2>
          <p className="text-lg text-muted max-w-2xl mx-auto leading-relaxed">
            Eight powerful AI tools integrated into a seamless experience. Stop switching between apps — everything lives here.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {features.map((feature) => (
            <motion.div
              variants={itemVariants}
              key={feature.title}
              className="group relative flex flex-col p-6 rounded-2xl border border-border/60 bg-surface/40 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-primary/40 hover:bg-surface/70 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(145,203,10,0.06)]"
            >
              {/* Hover glow */}
              <div className="absolute inset-0 bg-primary/3 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />

              <div className="relative z-10">
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors duration-300">
                  {feature.icon}
                </div>

                {/* Text */}
                <h3 className="text-sm font-semibold text-foreground mb-2 group-hover:text-primary transition-colors duration-200">
                  {feature.title}
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
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
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-light transition-colors no-underline group"
          >
            Explore all features
            <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
