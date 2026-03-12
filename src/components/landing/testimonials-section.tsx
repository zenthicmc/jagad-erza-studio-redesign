"use client";

import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Content Marketing Manager",
    company: "TechFlow",
    avatar: "SC",
    rating: 5,
    text: "Erza Studio completely transformed how our team creates content. What used to take 3 hours now takes 20 minutes. The Writing Assistant is incredibly accurate and the Humanizer is a game-changer.",
  },
  {
    name: "Marcus Rivera",
    role: "Freelance Writer",
    company: "Self-employed",
    avatar: "MR",
    rating: 5,
    text: "I was skeptical at first, but the Grammar Checker and Paraphraser have genuinely improved my writing quality. My clients notice the difference. Worth every penny.",
  },
  {
    name: "Priya Nair",
    role: "PhD Student",
    company: "University of Melbourne",
    avatar: "PN",
    rating: 5,
    text: "The AI Detector and Humanizer are essential for my academic work. I can ensure my writing sounds authentic while still getting AI assistance. Saved my thesis deadline!",
  },
  {
    name: "James Okafor",
    role: "Digital Marketing Consultant",
    company: "GrowthLab",
    avatar: "JO",
    rating: 5,
    text: "Managing content for 12 clients used to be overwhelming. With Erza Studio's Collection feature and Writing Assistant, I've doubled my output without hiring additional staff.",
  },
  {
    name: "Lena Müller",
    role: "Blogger & YouTuber",
    company: "LenaTalks",
    avatar: "LM",
    rating: 5,
    text: "The all-in-one approach is what sold me. I don't need 5 different subscriptions anymore. Erza Studio does it all — and does it well. My content quality has never been higher.",
  },
  {
    name: "David Park",
    role: "Startup Founder",
    company: "Nexus AI",
    avatar: "DP",
    rating: 5,
    text: "We use Erza Studio across our entire marketing team. The consistency in output quality is remarkable. The AI Chat feature alone has replaced our need for a dedicated copywriter.",
  },
];

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-28 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="absolute inset-0 bg-surface/20" />
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
            <span>Loved by Creators</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-5">
            Trusted by{" "}
            <span className="text-gradient-primary">50,000+ users.</span>
          </h2>
          <p className="text-lg text-muted max-w-xl mx-auto leading-relaxed">
            Don&apos;t just take our word for it. Here&apos;s what creators, writers, and professionals say about Erza Studio.
          </p>

          {/* Rating summary */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} size={18} className="text-primary fill-primary" />
            ))}
            <span className="text-sm font-semibold text-foreground ml-1">4.9 / 5</span>
            <span className="text-sm text-muted">from 2,400+ reviews</span>
          </div>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col p-6 rounded-2xl border border-border/60 bg-surface/40 hover:border-primary/20 hover:bg-surface/70 transition-all duration-300"
            >
              {/* Quote icon */}
              <Quote size={20} className="text-primary/30 mb-4 flex-shrink-0" />

              {/* Text */}
              <p className="text-sm text-muted leading-relaxed flex-1 mb-5">
                &ldquo;{testimonial.text}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-4 border-t border-border/60">
                <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary">{testimonial.avatar}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">{testimonial.name}</div>
                  <div className="text-xs text-muted truncate">{testimonial.role} · {testimonial.company}</div>
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} size={11} className="text-primary fill-primary" />
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
