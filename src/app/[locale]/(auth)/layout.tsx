import { AuthSwitchers } from "@/components/auth/auth-switchers";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md px-6">{children}</div>
      <AuthSwitchers />
    </div>
  );
}
