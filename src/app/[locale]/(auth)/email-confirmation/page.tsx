"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import toast from "react-hot-toast";
import { Mail, AlertTriangle } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { AuthLogo } from "@/components/auth/auth-logo";
import api from "@/lib/api";
import { handleFormApiError } from "@/lib/error-handler";

interface ForgotPasswordFormData {
  email: string;
}

export default function EmailConfirmationPage() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const errorKey = searchParams.get("error");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<ForgotPasswordFormData>({
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);

    try {
      const res = await api.post("/api/auth/forget-password", {
        email: data.email,
      });

      if (res?.data) {
        setEmailSent(true);
        toast.success(t("auth.resetLinkSentToast"));
      }
    } catch (error: unknown) {
      handleFormApiError(error, {
        setError,
        t,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <AuthLogo />

      {emailSent ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-5">
            <Mail size={28} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {t("auth.checkEmail")}
          </h1>
          <p className="text-muted mb-6">{t("auth.resetLinkSentDesc")}</p>
          <Button variant="secondary" onClick={() => setEmailSent(false)} size="md">
            {t("auth.tryAnotherEmail")}
          </Button>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-foreground mb-1">
            {t("auth.forgotPasswordTitle")}
          </h1>
          <p className="text-muted mb-8">{t("auth.forgotPasswordDesc")}</p>

          {(errorKey === "token_expired" || errorKey === "invalid_token") && (
            <div className="flex items-start gap-3 p-4 mb-6 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-red-500">
                {errorKey === "token_expired"
                  ? t("auth.resetLinkExpired")
                  : t("auth.resetLinkInvalid")}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label={t("auth.email")}
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              error={errors.email?.message}
              {...register("email", {
                required: t("ErrorMessage.error_email"),
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: t("ErrorMessage.pattern_email"),
                },
              })}
            />

            <Button type="submit" loading={isLoading} fullWidth size="md">
              {t("auth.sendResetLink")}
            </Button>
          </form>

          <p className="text-center text-sm text-muted mt-6">
            <Link
              href="/signin"
              className="text-primary hover:underline font-medium"
            >
              {t("auth.backToSignIn")}
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
