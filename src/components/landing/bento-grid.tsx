"use client";

import {
  Sparkles,
  Globe,
  FileText,
  MessageSquare,
  ImageIcon
} from "lucide-react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

export default function BentoGrid() {
  const t = useTranslations("landing.bento");

  const features = [
    {
      title: t("aiWriting"),
      description: t("aiWritingDesc"),
      icon: <FileText size={24} className="text-primary" />,
      colSpan: "md:col-span-2",
      rowSpan: "md:row-span-1",
      glow: "bg-primary/5",
    },
    {
      title: t("smartChat"),
      description: t("smartChatDesc"),
      icon: <MessageSquare size={24} className="text-secondary" />,
      colSpan: "md:col-span-1",
      rowSpan: "md:row-span-2",
      glow: "bg-secondary/5",
    },
    {
      title: t("imageGen"),
      description: t("imageGenDesc"),
      icon: <ImageIcon size={24} className="text-accent" />,
      colSpan: "md:col-span-2",
      rowSpan: "md:row-span-1",
      glow: "bg-accent/5",
    },
    {
      title: t("multilingual"),
      description: t("multilingualDesc"),
      icon: <Globe size={24} className="text-secondary-dark" />,
      colSpan: "md:col-span-3",
      rowSpan: "md:row-span-1",
      glow: "bg-secondary-dark/5",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
  };

  return (
    <section id="features" className="py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Everything you need in <span className="text-gradient">one studio.</span>
          </h2>
          <p className="text-lg text-muted max-w-2xl mx-auto">
            Powerful tools integrated into a seamless experience. Stop switching between 10 different apps.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[250px]"
        >
          {features.map((feature) => (
            <motion.div
              variants={itemVariants}
              key={feature.title}
              className={`group relative flex flex-col justify-between p-8 rounded-3xl border border-border/50 bg-surface/30 backdrop-blur-md overflow-hidden transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_30px_rgba(177,243,21,0.05)] hover:-translate-y-1 ${feature.colSpan} ${feature.rowSpan}`}
            >
              <div className={`absolute inset-0 ${feature.glow} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

              <div className="relative z-10 flex flex-col h-full">
                <div className="w-12 h-12 rounded-2xl bg-surface border border-border/50 flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>

                <div className="mt-auto">
                  <h3 className="text-xl font-semibold mb-2 text-fg group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-muted leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>

              <div className="absolute top-0 right-0 p-6 opacity-0 translate-x-4 -translate-y-4 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-500">
                <Sparkles size={20} className="text-primary/30" />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
