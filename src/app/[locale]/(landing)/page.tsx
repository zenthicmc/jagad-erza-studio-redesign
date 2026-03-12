import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import LandingHero from "./landing-hero";
import BentoGrid from "@/components/landing/bento-grid";
import HowItWorks from "@/components/landing/how-it-works";
import BenefitsSection from "@/components/landing/benefits-section";
import UseCasesSection from "@/components/landing/use-cases-section";
import ProductPreview from "@/components/landing/product-preview";
import TestimonialsSection from "@/components/landing/testimonials-section";
import PricingSection from "@/components/landing/pricing-section";
import CtaSection from "@/components/landing/cta-section";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Erza Studio — AI-Powered Creative Studio",
    description:
      "The all-in-one AI studio for creators and writers. Generate high-quality content with Writing Assistant, Humanizer, Paraphraser, Grammar Checker, AI Detector, and more.",
  };
}

export default async function LandingPage() {
  const t = await getTranslations("landing");

  return (
    <>
      <LandingHero
        title={t("heroTitle")}
        subtitle={t("heroSubtitle")}
        ctaPrimary={t("getStarted")}
        ctaSecondary={t("learnMore")}
        ctaAuthenticated={t("goToApp")}
      />
      <BentoGrid />
      <HowItWorks />
      <BenefitsSection />
      <UseCasesSection />
      <ProductPreview />
      <TestimonialsSection />
      <PricingSection />
      <CtaSection />
    </>
  );
}
