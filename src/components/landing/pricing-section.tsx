"use client";

import { Check, Sparkles, Zap } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function PricingSection() {
  const t = useTranslations("landing.pricing");

  const plans = [
    {
      name: t("starterTitle"),
      description: t("starterDesc"),
      price: "$9",
      period: t("month"),
      features: [
        t("starterFeature1"),
        t("starterFeature2"),
        t("starterFeature3"),
        t("starterFeature4"),
      ],
      cta: t("startTrial"),
      popular: false,
    },
    {
      name: t("proTitle"),
      description: t("proDesc"),
      price: "$29",
      period: t("month"),
      features: [
        t("proFeature1"),
        t("proFeature2"),
        t("proFeature3"),
        t("proFeature4"),
        t("proFeature5"),
      ],
      cta: t("startTrial"),
      popular: true,
      glow: "bg-primary/20",
    },
    {
      name: t("teamTitle"),
      description: t("teamDesc"),
      price: "$79",
      period: t("month"),
      features: [
        t("teamFeature1"),
        t("teamFeature2"),
        t("teamFeature3"),
        t("teamFeature4"),
        t("teamFeature5"),
      ],
      cta: t("contactSales"),
      popular: false,
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
    <section id="pricing" className="py-24 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-medium mb-6">
            <Zap size={14} />
            <span>{t("badge")}</span>
          </div>
          <h2
            className="text-3xl md:text-5xl font-bold tracking-tight mb-4 [&>productivity]:text-gradient [&>productivity]:font-bold"
            dangerouslySetInnerHTML={{ __html: t.raw("title") }}
          />
          <p className="text-lg text-muted max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto"
        >
          {plans.map((plan) => (
            <motion.div
              variants={itemVariants}
              key={plan.name}
              className={`relative flex flex-col p-8 rounded-[2rem] border transition-all duration-300 ${plan.popular
                ? "border-primary shadow-[0_0_40px_rgba(177,243,21,0.1)] bg-surface/60 backdrop-blur-xl md:-translate-y-4"
                : "border-border/50 bg-surface/30 backdrop-blur-md hover:border-primary/30"
                }`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1.5 bg-primary text-bg text-sm font-bold uppercase tracking-wider rounded-full shadow-lg shadow-primary/20 flex items-center gap-1.5">
                  <Sparkles size={14} /> {t("mostPopular")}
                </div>
              )}

              {plan.glow && (
                <div className={`absolute inset-0 ${plan.glow} rounded-[2rem] blur-3xl -z-10 opacity-30 pointer-events-none`} />
              )}

              <div className="mb-8">
                <h3 className="text-2xl font-bold text-fg mb-2">{plan.name}</h3>
                <p className="text-muted text-sm">{plan.description}</p>
              </div>

              <div className="mb-8 flex items-baseline gap-1">
                <span className="text-5xl font-extrabold tracking-tight text-fg">{plan.price}</span>
                <span className="text-muted font-medium">{plan.period}</span>
              </div>

              <ul className="space-y-4 mb-8 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-fg text-sm">
                    <div className="mt-0.5 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Check size={12} className="text-primary" />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className={`w-full py-4 px-6 rounded-xl font-semibold text-center transition-all ${plan.popular
                  ? "bg-primary text-bg hover:bg-primary-light shadow-[0_0_20px_rgba(177,243,21,0.2)]"
                  : "bg-surface text-fg border border-border hover:bg-surface-hover"
                  }`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
