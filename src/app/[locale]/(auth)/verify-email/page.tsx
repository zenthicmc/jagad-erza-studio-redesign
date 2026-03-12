"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import toast from "react-hot-toast";
import { Mail, Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui";
import { AuthLogo } from "@/components/auth/auth-logo";
import api from "@/lib/api";

export default function VerifyEmailPage() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  const [countdown, setCountdown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (email) {
      handleGetTtl(email);
    }
  }, [email]);

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

  const handleGetTtl = async (userEmail: string) => {
    try {
      const res = await api.get(`/api/auth/resend?email=${userEmail}`);
      if (res?.data?.result?.ttl) {
        setCountdown(res.data.result.ttl);
      }
    } catch (error) {
      console.error("Failed to get TTL:", error);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || !email) return;

    setIsResending(true);
    try {
      const res = await api.post("/api/auth/resend", { email });
      if (res?.data?.result?.ttl) {
        setCountdown(res.data.result.ttl);
        toast.success(t("Alert.verification_email_sent"));
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string; message?: string } } };
      const errorKey =
        err?.response?.data?.error || err?.response?.data?.message;
      if (errorKey) {
        toast.error(t(`ErrorMessageResponse.${errorKey}`));
      } else {
        toast.error(t("ErrorMessage.error_database"));
      }
    } finally {
      setIsResending(false);
    }
  };

  if (!email) {
    return (
      <div className="w-full text-center py-12">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {t("auth.invalidRequest")}
        </h1>
        <p className="text-muted mb-6">{t("auth.noEmailProvided")}</p>
        <Link href="/signin">
          <Button variant="secondary" icon={

            <ArrowLeft size={18} />
          }>
            {t("common.back_to_signin")}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      <AuthLogo />

      <div className="text-center py-8">
        <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-6 animate-pulse">
          <Mail size={36} className="text-white" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">
          {t("VerifyEmail.title")}
        </h1>

        <p className="text-muted mb-2 max-w-md mx-auto">
          {t("VerifyEmail.message")}
        </p>

        <p className="text-sm text-muted/80 mb-8">
          {t("auth.emailSentTo")}{" "}
          <span className="font-medium text-foreground">{email}</span>
        </p>

        <div className="flex flex-col space-y-4 max-w-sm mx-auto">
          <button
            className={`py-5 text-sm cursor-pointer w-fit mx-auto ${countdown > 0 || isResending ? "opacity-50 cursor-not-allowed" : "text-primary hover:underline"}`}
            onClick={handleResend}
            disabled={countdown > 0 || isResending}
          >
            {countdown > 0 ? (
              <span className="flex items-center justify-center gap-2">
                <Clock size={16} />
                {t("common.wait")} {countdown}s
              </span>
            ) : (
              t("VerifyEmail.resend_link")
            )}
          </button>

          <Link href="/signin" className="block">
            <Button fullWidth icon={<ArrowLeft size={18} />} size="md">
              {t("common.back_to_signin")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
