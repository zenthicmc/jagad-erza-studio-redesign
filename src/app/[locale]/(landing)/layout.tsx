import LandingHeader from "@/components/layouts/landing-header";
import LandingFooter from "@/components/layouts/landing-footer";

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <LandingHeader />
      <main className="min-h-screen pt-[var(--header-height)]">{children}</main>
      <LandingFooter />
    </>
  );
}
