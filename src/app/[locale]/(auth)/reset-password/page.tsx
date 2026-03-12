"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import toast from "react-hot-toast";
import { Button, Input } from "@/components/ui";
import { AuthLogo } from "@/components/auth/auth-logo";
import api from "@/lib/api";
import { handleFormApiError } from "@/lib/error-handler";

interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<ResetPasswordFormData>({
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (data.confirmPassword !== data.password) {
      setError("confirmPassword", {
        message: t("ErrorMessage.error_confirmation"),
      });
      return;
    }

    setIsLoading(true);

    try {
      const res = await api.post("/api/auth/reset-password", {
        token,
        new_password: data.password,
      });

      if (res?.data) {
        toast.success(t("auth.resetSuccess"));
        router.push("/signin");
      }
    } catch (error: unknown) {
      handleFormApiError(error, {
        setError,
        t,
        fieldMap: { new_password: "password" },
        onUnhandled: (errorKey) => {
          if (
            errorKey === "token_expired" ||
            errorKey === "invalid_token"
          ) {
            router.push(`/email-confirmation?error=${errorKey}`);
          }
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="w-full text-center py-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {t("auth.invalidLink")}
        </h1>
        <p className="text-muted mb-6">{t("auth.invalidLinkDescription")}</p>
        <Link href="/email-confirmation">
          <Button variant="secondary">{t("auth.requestNewLink")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      <AuthLogo />

      <h1 className="text-2xl font-bold text-foreground mb-1">
        {t("auth.resetPasswordTitle")}
      </h1>
      <p className="text-muted mb-8">{t("auth.enterNewPassword")}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label={t("auth.newPassword")}
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

        <Button type="submit" loading={isLoading} fullWidth size="md">
          {t("auth.resetPassword")}
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
    </div>
  );
}
