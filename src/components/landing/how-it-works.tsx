"use client";

import { motion } from "framer-motion";
import { UserPlus, LayoutDashboard, Wand2, Download } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: <UserPlus size={22} className="text-primary" />,
    title: "Create Your Account",
    description: "Sign up in seconds. No credit card required. Get instant access to all AI tools from day one.",
  },
  {
    number: "02",
    icon: <LayoutDashboard size={22} className="text-primary" />,
    title: "Choose Your Tool",
    description: "Pick from Writing Assistant, Humanizer, Paraphraser, Grammar Checker, AI Detector, and more.",
  },
  {
    number: "03",
    icon: <Wand2 size={22} className="text-primary" />,
    title: "Generate with AI",
    description: "Input your text or topic, customize settings, and let the AI produce high-quality results instantly.",
  },
  {
    number: "04",
    icon: <Download size={22} className="text-primary" />,
    title: "Save & Export",
    description: "Save your work to Collections, export in multiple formats, or continue refining with other tools.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-28 relative overflow-hidden">
      {/* Divider line top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-16 bg-gradient-to-b from-transparent to-border" />

      <div className="max-w-7xl mx-auto px-6">
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
            <span>Simple Process</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-5">
            Get started in{" "}
            <span className="text-gradient-primary">4 simple steps.</span>
          </h2>
          <p className="text-lg text-muted max-w-xl mx-auto leading-relaxed">
            From sign-up to your first AI-generated content — it takes less than 2 minutes.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Connector line (desktop) */}
          <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-border to-transparent" />

          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex flex-col items-center text-center"
            >
              {/* Step number + icon */}
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-2xl border border-border bg-surface flex items-center justify-center shadow-sm relative z-10">
                  {step.icon}
                </div>
                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-bg text-[10px] font-bold flex items-center justify-center z-20">
                  {index + 1}
                </span>
              </div>

              <h3 className="text-base font-semibold text-foreground mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-muted leading-relaxed max-w-[200px]">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
