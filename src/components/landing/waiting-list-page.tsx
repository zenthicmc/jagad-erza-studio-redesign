"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Check,
  Users,
  Zap,
  Star,
  PenLine,
  Wand2,
  SpellCheck,
  ScanSearch,
  ChevronLeft,
} from "lucide-react";

const features = [
  { icon: <PenLine size={14} className="text-primary" />, label: "Writing Assistant" },
  { icon: <Wand2 size={14} className="text-primary" />, label: "Humanizer" },
  { icon: <SpellCheck size={14} className="text-primary" />, label: "Grammar Checker" },
  { icon: <ScanSearch size={14} className="text-primary" />, label: "AI Detector" },
];

const benefits = [
  "Early access before public launch",
  "Exclusive founding member pricing",
  "Priority support & onboarding",
  "Direct influence on product roadmap",
];

const useOptions = [
  "Academic writing & research",
  "Blog & content marketing",
  "Copywriting & advertising",
  "Social media content",
  "Professional & business writing",
  "Creative writing & fiction",
  "Other",
];

export default function WaitingListPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    useCase: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  const validate = () => {
    const newErrors: { name?: string; email?: string } = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = "Please enter a valid email";
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/5 rounded-full blur-[180px]" />
        <div className="absolute bottom-[10%] left-[10%] w-[400px] h-[400px] bg-primary/3 rounded-full blur-[160px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_30%,#000_10%,transparent_100%)]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-16 md:py-24">
        {/* Back link */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-12"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors no-underline group"
          >
            <ChevronLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to home
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Left: Info */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-medium mb-8">
              <Sparkles size={13} className="animate-pulse" />
              <span>Early Access Program</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-6">
              Be the first to experience{" "}
              <span className="text-gradient-primary">Erza Studio.</span>
            </h1>

            <p className="text-lg text-muted leading-relaxed mb-10">
              Join our waiting list and get exclusive early access to the all-in-one AI writing studio. Founding members receive special pricing and priority support.
            </p>

            {/* Benefits */}
            <div className="space-y-3 mb-10">
              {benefits.map((benefit) => (
                <div key={benefit} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
                    <Check size={11} className="text-primary" />
                  </div>
                  <span className="text-sm text-foreground">{benefit}</span>
                </div>
              ))}
            </div>

            {/* Tools preview */}
            <div className="p-5 rounded-2xl border border-border/60" style={{ background: 'var(--surface)' }}>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Included Tools</p>
              <div className="flex flex-wrap gap-2">
                {features.map((f) => (
                  <div
                    key={f.label}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground"
                    style={{ background: 'var(--bg)' }}
                  >
                    {f.icon}
                    {f.label}
                  </div>
                ))}
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted"
                  style={{ background: 'var(--bg)' }}
                >
                  +4 more tools
                </div>
              </div>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-5 mt-8">
              <div className="flex items-center gap-2 text-sm text-muted">
                <Users size={14} className="text-primary" />
                <span><strong className="text-foreground">2,400+</strong> already joined</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} size={12} className="text-primary fill-primary" />
                ))}
                <span className="ml-1"><strong className="text-foreground">4.9/5</strong></span>
              </div>
            </div>
          </motion.div>

          {/* Right: Form */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              className="rounded-2xl border border-border/70 overflow-hidden shadow-xl"
              style={{ background: 'var(--surface)' }}
            >
              {/* Card header */}
              <div className="px-8 py-6 border-b border-border" style={{ background: 'var(--bg)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Zap size={16} className="text-primary" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-foreground">Join the Waiting List</h2>
                    <p className="text-xs text-muted mt-0.5">Free · No credit card required</p>
                  </div>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {!submitted ? (
                  <motion.form
                    key="form"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.3 }}
                    onSubmit={handleSubmit}
                    className="px-8 py-8 space-y-5"
                  >
                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Full Name <span className="text-primary">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Alex Johnson"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full h-11 px-4 rounded-xl border text-sm text-foreground placeholder:text-muted transition-colors outline-none focus:border-primary/60"
                        style={{
                          background: 'var(--bg)',
                          borderColor: errors.name ? '#ef4444' : 'var(--border-color)',
                        }}
                      />
                      {errors.name && (
                        <p className="text-xs text-red-400 mt-1.5">{errors.name}</p>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Email Address <span className="text-primary">*</span>
                      </label>
                      <input
                        type="email"
                        placeholder="e.g. alex@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full h-11 px-4 rounded-xl border text-sm text-foreground placeholder:text-muted transition-colors outline-none focus:border-primary/60"
                        style={{
                          background: 'var(--bg)',
                          borderColor: errors.email ? '#ef4444' : 'var(--border-color)',
                        }}
                      />
                      {errors.email && (
                        <p className="text-xs text-red-400 mt-1.5">{errors.email}</p>
                      )}
                    </div>

                    {/* Use case */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        What will you use Erza Studio for?{" "}
                        <span className="text-muted font-normal">(optional)</span>
                      </label>
                      <select
                        value={formData.useCase}
                        onChange={(e) => setFormData({ ...formData, useCase: e.target.value })}
                        className="w-full h-11 px-4 rounded-xl border border-border text-sm text-foreground transition-colors outline-none focus:border-primary/60 appearance-none cursor-pointer"
                        style={{ background: 'var(--bg)' }}
                      >
                        <option value="">Select an option...</option>
                        {useOptions.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>

                    {/* Submit */}
                    <div className="pt-2">
                      <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-primary-light rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-500" />
                        <button
                          type="submit"
                          disabled={loading}
                          className="relative w-full h-12 rounded-xl bg-primary text-bg font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary-light transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          {loading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
                              Joining...
                            </>
                          ) : (
                            <>
                              Reserve My Spot
                              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-muted text-center mt-3">
                        We respect your privacy. No spam, ever.
                      </p>
                    </div>
                  </motion.form>
                ) : (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="px-8 py-12 flex flex-col items-center text-center"
                  >
                    {/* Success icon */}
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(145,203,10,0.15)]">
                      <Check size={28} className="text-primary" />
                    </div>

                    <h3 className="text-2xl font-bold text-foreground mb-3">
                      You&apos;re on the list!
                    </h3>
                    <p className="text-sm text-muted leading-relaxed mb-2 max-w-[280px]">
                      Thanks, <strong className="text-foreground">{formData.name}</strong>! We&apos;ve reserved your spot. We&apos;ll notify you at{" "}
                      <strong className="text-foreground">{formData.email}</strong> when early access opens.
                    </p>
                    <p className="text-xs text-muted mb-8">
                      You&apos;re among the first to know. Stay tuned!
                    </p>

                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                      <Link
                        href="/"
                        className="flex-1 h-10 rounded-xl border border-border text-sm font-medium text-foreground flex items-center justify-center hover:border-primary/40 transition-colors no-underline"
                        style={{ background: 'var(--bg)' }}
                      >
                        Back to Home
                      </Link>
                      <Link
                        href="/signup"
                        className="flex-1 h-10 rounded-xl bg-primary text-bg text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-primary-light transition-colors no-underline"
                      >
                        <Sparkles size={13} />
                        Try Now
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
