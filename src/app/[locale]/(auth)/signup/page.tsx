"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import toast from "react-hot-toast";
import { AlertTriangle, Clock, Mail, ArrowLeft } from "lucide-react";
import { Button, Input, PhoneInput } from "@/components/ui";
import { AuthLogo } from "@/components/auth/auth-logo";
import { OAuthProviders } from "@/components/auth/oauth-providers";
import api from "@/lib/api";
import { handleFormApiError } from "@/lib/error-handler";

interface RegisterFormData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

const FIELD_MAP: Record<string, keyof RegisterFormData> = {
  full_name: "fullName",
  phone: "phone",
};

export default function RegisterPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);

  const errorKey = searchParams.get("error");
  const resendFromUrl = searchParams.get("resent") === "1";

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    control,
  } = useForm<RegisterFormData>({
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const [resendEmail, setResendEmail] = useState("");
  const [resendEmailError, setResendEmailError] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [resendSent, setResendSent] = useState(false);
  const showResendSuccess = resendSent || resendFromUrl;

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [countdown]);

  const handleResend = async () => {
    if (countdown > 0 || !resendEmail.trim()) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resendEmail.trim())) {
      setResendEmailError(t("ErrorMessage.pattern_email"));
      return;
    }
    setResendEmailError("");

    setIsResending(true);
    try {
      const res = await api.post("/api/auth/resend", {
        email: resendEmail.trim(),
      });
      if (res?.data?.result?.ttl) {
        setCountdown(res.data.result.ttl);
      }
      setResendSent(true);
      const params = new URLSearchParams(searchParams.toString());
      params.set("resent", "1");
      router.replace(`${pathname}?${params.toString()}`);
      toast.success(t("Alert.verification_email_sent"));
    } catch (error: unknown) {
      handleFormApiError(error, {
        setError: (_field, err) => setResendEmailError(err.message),
        t,
        fieldMap: { email: "email" },
        onUnhandled: (errKey) =>
          toast.error(t(`ErrorMessageResponse.${errKey}`)),
      });
    } finally {
      setIsResending(false);
    }
  };

  const onSubmit = async (data: RegisterFormData) => {
    if (data.confirmPassword !== data.password) {
      setError("confirmPassword", {
        message: t("ErrorMessage.error_confirmation"),
      });
      return;
    }

    setIsLoading(true);

    const payload: Record<string, string> = {
      email: data.email,
      full_name: data.fullName,
      password: data.password,
    };

    if (data.phone && data.phone.length > 4) {
      payload.phone = data.phone;
    }

    try {
      const res = await api.post("/api/auth/register", payload);

      if (res?.data) {
        toast.success(t("Alert.registration_success"));
        router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
      }
    } catch (error: unknown) {
      handleFormApiError(error, {
        setError,
        t,
        fieldMap: FIELD_MAP,
        onUnhandled: (errorKey) => {
          if (errorKey === "email_not_verified") {
            router.push(
              `/verify-email?email=${encodeURIComponent(data.email)}`,
            );
          }
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (errorKey === "token_expired") {
    return (
      <div className="w-full">
        <AuthLogo />

        <div className="text-center py-4">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-6">
            <Clock size={36} className="text-red-500" />
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">
            {t("auth.tokenExpiredTitle")}
          </h1>
          <p className="text-muted mb-8 max-w-md mx-auto">
            {t("auth.tokenExpiredDesc")}
          </p>

          {!showResendSuccess ? (
            <div className="max-w-sm mx-auto space-y-4">
              <Input
                type="email"
                placeholder="you@example.com"
                value={resendEmail}
                onChange={(e) => {
                  setResendEmail(e.target.value);
                  if (resendEmailError) setResendEmailError("");
                }}
                error={resendEmailError}
                fullWidth
              />
              <Button
                fullWidth
                size="md"
                icon={<Mail size={18} />}
                onClick={handleResend}
                loading={isResending}
                disabled={!resendEmail.trim() || countdown > 0}
              >
                {countdown > 0
                  ? `${t("common.wait")} ${countdown}s`
                  : t("auth.resendVerification")}
              </Button>
            </div>
          ) : (
            <div className="max-w-sm mx-auto space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <Mail size={18} className="text-green-500 shrink-0 mt-0.5" />
                <p className="text-sm text-green-600 text-left">
                  {t("auth.verificationResent")}
                </p>
              </div>

              {countdown > 0 && (
                <p className="text-sm text-muted flex items-center justify-center gap-1">
                  <Clock size={14} />
                  {t("common.wait")} {countdown}s
                </p>
              )}

              <button
                className={`text-sm mx-auto block ${countdown > 0 ? "text-muted cursor-not-allowed" : "text-primary hover:underline cursor-pointer"}`}
                onClick={handleResend}
                disabled={countdown > 0 || isResending}
              >
                {t("VerifyEmail.resend_link")}
              </button>
            </div>
          )}

          <div className="mt-6">
            <Link
              href="/signin"
              className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
            >
              <ArrowLeft size={14} />
              {t("common.back_to_signin")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <AuthLogo />

      <h1 className="text-2xl font-bold text-foreground mb-1">
        {t("auth.createAccountTitle")}
      </h1>
      <p className="text-muted mb-8">{t("auth.startJourney")}</p>

      {errorKey && (
        <div className="flex items-start gap-3 p-4 mb-6 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-500">
              {t(`ErrorMessageResponse.${errorKey}`)}
            </p>
          </div>
        </div>
      )}

      <div className="mb-6">
        <OAuthProviders />
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted uppercase">
          {t("auth.orDivider")}
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label={t("auth.fullName")}
          placeholder="John Doe"
          autoComplete="name"
          error={errors.fullName?.message}
          {...register("fullName", {
            required: t("ErrorMessage.error_name"),
          })}
        />

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

        <Controller
          name="phone"
          control={control}
          render={({ field }) => (
            <PhoneInput
              label={t("auth.phoneOptional")}
              placeholder="812 3456 7890"
              error={errors.phone?.message}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
            />
          )}
        />

        <Input
          label={t("auth.password")}
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register("password", {
            required: t("ErrorMessage.error_password"),
            minLength: {
              value: 8,
              message: t("ErrorMessage.pattern_password"),
            },
          })}
        />

        <Input
          label={t("auth.confirmPassword")}
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword", {
            required: t("UserInput.confirmation_password"),
          })}
        />

        <Button
          type="submit"
          loading={isLoading}
          fullWidth
          size="md"
          className="mt-2"
        >
          {t("auth.createAccountButton")}
        </Button>
      </form>

      <p className="text-center text-sm text-muted mt-6">
        {t("auth.hasAccount")}{" "}
        <Link
          href="/signin"
          className="text-primary hover:underline font-medium"
        >
          {t("auth.signIn")}
        </Link>
      </p>
    </div>
  );
}
