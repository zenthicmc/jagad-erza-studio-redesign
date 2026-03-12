"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/routing";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { useAuthStore } from "@/stores/auth-store";
import { Spinner } from "@/components/ui";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.dev.erza.ai/";

const LOCALE_TO_ACCEPT_LANGUAGE: Record<string, string> = {
  en: "en-US",
  id: "id-ID",
};

const OAUTH_PROVIDERS = ["google", "facebook", "apple"] as const;

function isValidProvider(
  value: string | null,
): value is (typeof OAUTH_PROVIDERS)[number] {
  return (
    value !== null &&
    OAUTH_PROVIDERS.includes(value as (typeof OAUTH_PROVIDERS)[number])
  );
}

export default function OAuthRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations();

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const type = searchParams.get("type");
  const shareId = searchParams.get("share_id");
  const rawProvider = searchParams.get("provider");
  const error = searchParams.get("error");

  const isAccessDenied = error === "access_denied";

  const validationError = isAccessDenied
    ? t("ErrorMessageResponse.oauth_access_denied")
    : !code || !state
      ? t("ErrorMessageResponse.oauth_exchange_failed")
      : null;

  const [apiError, setApiError] = useState<string | null>(null);

  const processedRef = useRef(false);

  useEffect(() => {
    if (validationError) return;

    if (processedRef.current) return;
    processedRef.current = true;

    const resolvedProvider = isValidProvider(rawProvider)
      ? rawProvider
      : "google";

    const exchangeCode = async () => {
      try {
        const params = new URLSearchParams({ code: code!, state: state! });
        if (type) params.set("type", type);
        if (shareId) params.set("share_id", shareId);

        const acceptLanguage = LOCALE_TO_ACCEPT_LANGUAGE[locale] ?? "en-US";

        const res = await axios.get(
          `${API_URL}api/oauth/${resolvedProvider}/callback?${params.toString()}`,
          {
            headers: {
              "Accept-Language": acceptLanguage,
            },
            withCredentials: true,
          },
        );

        const result = res.data?.result;

        if (result?.profile) {
          useAuthStore.setState({
            user: result.profile,
            isAuthenticated: true,
            isLoading: false,
            hasFetched: true,
          });

          localStorage.setItem(
            "user-profile",
            JSON.stringify(result.profile),
          );

          toast.success(t("Alert.login_success"));

          await getRefreshToken();
          window.location.href = `/${locale}/dashboard`;
        } else {
          setApiError(t("ErrorMessageResponse.oauth_exchange_failed"));
        }
      } catch {
        setApiError(t("ErrorMessageResponse.oauth_exchange_failed"));
      }
    };

    const getRefreshToken = async () => {
      try {
        const res = await axios.get(`${API_URL}api/auth/refresh-token`, {
          withCredentials: true,
        });
        const d = res.data;
        const accessToken =
          d?.key?.access_token ||
          d?.access_token ||
          d?.result?.access_token ||
          d?.result?.key?.access_token;

        if (accessToken) {
          Cookies.set("access_token", accessToken, {
            path: "/",
            expires: 1,
            sameSite: "lax",
          });
        }
      } catch (e) {
        console.error("Error getting refresh token:", e);
      }
    };

    exchangeCode();
  }, [
    code,
    state,
    type,
    shareId,
    rawProvider,
    validationError,
    router,
    t,
    locale,
  ]);

  const displayError = validationError || apiError;

  if (displayError) {
    return (
      <div className="text-center space-y-4">
        <p className="text-sm text-red-500">{displayError}</p>
        <button
          onClick={() => router.push("/signin")}
          className="text-sm text-primary hover:text-primary/80 transition-colors underline"
        >
          {t("common.back_to_signin")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <Spinner size="lg" />
      <p className="text-sm text-muted">{t("common.loading")}</p>
    </div>
  );
}
