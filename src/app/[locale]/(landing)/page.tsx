import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import LandingHero from "./landing-hero";
import BentoGrid from "@/components/landing/bento-grid";
import PricingSection from "@/components/landing/pricing-section";
import CtaSection from "@/components/landing/cta-section";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Erza Studio — AI-Powered Creative Studio",
    description:
      "The all-in-one AI studio for creators and writers. Generate high-quality content and images with AI.",
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
      <PricingSection />
      <CtaSection />
    </>
  );
}
