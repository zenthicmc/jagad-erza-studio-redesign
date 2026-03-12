"use client";

import { motion } from "framer-motion";
import { GraduationCap, PenTool, Megaphone, Video, Briefcase, Users } from "lucide-react";

const useCases = [
  {
    icon: <GraduationCap size={24} className="text-primary" />,
    title: "Students",
    subtitle: "Academic writing made easier",
    description: "Paraphrase research, check grammar, detect AI content, and humanize essays to meet academic integrity standards.",
    tags: ["Grammar Checker", "Paraphraser", "AI Detector"],
  },
  {
    icon: <PenTool size={24} className="text-primary" />,
    title: "Writers",
    subtitle: "From blank page to published",
    description: "Use the Writing Assistant to overcome writer's block, then humanize and refine your drafts to perfection.",
    tags: ["Writing Assistant", "Humanizer", "Collection"],
  },
  {
    icon: <Megaphone size={24} className="text-primary" />,
    title: "Marketers",
    subtitle: "Scale content production",
    description: "Generate compelling ad copy, blog posts, and email campaigns at scale without sacrificing quality.",
    tags: ["Writing Assistant", "Paraphraser", "AI Chat"],
  },
  {
    icon: <Video size={24} className="text-primary" />,
    title: "Content Creators",
    subtitle: "More content, less effort",
    description: "Repurpose existing content, generate scripts, and maintain a consistent publishing schedule effortlessly.",
    tags: ["Humanizer", "Paraphraser", "Collection"],
  },
  {
    icon: <Briefcase size={24} className="text-primary" />,
    title: "Professionals",
    subtitle: "Polished business communication",
    description: "Draft reports, proposals, and emails with AI assistance, then ensure they're grammatically flawless.",
    tags: ["Writing Assistant", "Grammar Checker", "AI Chat"],
  },
  {
    icon: <Users size={24} className="text-primary" />,
    title: "Teams & Agencies",
    subtitle: "Collaborate and deliver faster",
    description: "Manage content projects in Collections, maintain brand voice consistency, and deliver client work faster.",
    tags: ["Collection", "Writing Assistant", "Humanizer"],
  },
];

export default function UseCasesSection() {
  return (
    <section id="use-cases" className="py-28 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-primary/3 rounded-full blur-[160px]" />
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
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-surface/50 text-muted text-sm font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span>Who It&apos;s For</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-5">
            Built for{" "}
            <span className="text-gradient-primary">every creator.</span>
          </h2>
          <p className="text-lg text-muted max-w-xl mx-auto leading-relaxed">
            Whether you&apos;re a student, professional, or content creator — Erza Studio adapts to your workflow.
          </p>
        </motion.div>

        {/* Use Cases Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {useCases.map((useCase, index) => (
            <motion.div
              key={useCase.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="group flex flex-col p-6 rounded-2xl border border-border/60 bg-surface/40 hover:border-primary/30 hover:bg-surface/70 transition-all duration-300 hover:-translate-y-0.5"
            >
              {/* Icon + Title */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/15 transition-colors">
                  {useCase.icon}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground leading-tight">
                    {useCase.title}
                  </h3>
                  <p className="text-xs text-primary font-medium mt-0.5">
                    {useCase.subtitle}
                  </p>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-muted leading-relaxed mb-5 flex-1">
                {useCase.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                {useCase.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium border border-border bg-background text-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
