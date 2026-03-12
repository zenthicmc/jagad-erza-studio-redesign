"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import toast from "react-hot-toast";
import Cookies from "js-cookie";
import { ArrowLeft } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { AuthLogo } from "@/components/auth/auth-logo";
import { OAuthProviders } from "@/components/auth/oauth-providers";
import { useAuthStore } from "@/stores/auth-store";
import api from "@/lib/api";
import { handleFormApiError, getErrorMessage } from "@/lib/error-handler";

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface TwoFactorState {
  tempToken: string;
  rememberMe: boolean;
}

const TWO_FACTOR_STORAGE_KEY = "two-factor-login-state";

function getSavedTwoFactorState(): TwoFactorState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(TWO_FACTOR_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.tempToken) return parsed as TwoFactorState;
  } catch {
    // ignore
  }
  return null;
}

function saveTwoFactorState(state: TwoFactorState | null) {
  if (typeof window === "undefined") return;
  if (state) {
    sessionStorage.setItem(TWO_FACTOR_STORAGE_KEY, JSON.stringify(state));
  } else {
    sessionStorage.removeItem(TWO_FACTOR_STORAGE_KEY);
  }
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const errorKey = searchParams.get("error");
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const [twoFactorState, setTwoFactorStateRaw] = useState<TwoFactorState | null>(null);
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const setTwoFactorState = (state: TwoFactorState | null) => {
    setTwoFactorStateRaw(state);
    saveTwoFactorState(state);
  };

  useEffect(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      hasFetched: false,
    });
    const saved = getSavedTwoFactorState();
    if (saved) {
      setTwoFactorStateRaw(saved);
    }
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (errorKey === "token_expired" || errorKey === "invalid_token") {
      router.push(`/email-confirmation?error=${errorKey}`);
    }
  }, [errorKey, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormData>({
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);

    try {
      const res = await api.post("/api/auth/login", {
        email: data.email,
        password: data.password,
        remember_me: data.rememberMe,
      });

      const result = res?.data?.result;

      if (result?.profile?.two_factor_enabled && result?.temp_token) {
        setTwoFactorState({
          tempToken: result.temp_token,
          rememberMe: data.rememberMe,
        });
        setIsLoading(false);
        return;
      }

      if (result?.access_token) {
        Cookies.set("access_token", result.access_token, {
          path: "/",
          expires: data.rememberMe ? 7 : 1,
          sameSite: "lax",
        });

        if (data.rememberMe) {
          localStorage.setItem("remember_me", "true");
        } else {
          localStorage.removeItem("remember_me");
        }

        useAuthStore.setState({
          user: result.profile || null,
          isAuthenticated: true,
          isLoading: false,
          hasFetched: true,
        });

        if (result?.profile) {
          localStorage.setItem("user-profile", JSON.stringify(result.profile));
        }

        toast.success(t("Alert.login_success"));
        saveTwoFactorState(null);
        router.push(callbackUrl || "/dashboard");
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

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...otpCode];
    newCode[index] = value.slice(-1);
    setOtpCode(newCode);
    setTwoFactorError(null);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  useEffect(() => {
    if (otpCode.join("").length === 6 && !isVerifying) {
      handleVerify2FA();
    }
  }, [otpCode]);

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "");
    if (pastedData.length === 6) {
      const newCode = pastedData.split("");
      setOtpCode(newCode);
      setTwoFactorError(null);
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify2FA = async () => {
    if (!twoFactorState) return;

    const code = otpCode.join("");
    if (code.length !== 6) return;

    setIsVerifying(true);
    setTwoFactorError(null);
    saveTwoFactorState(null);

    try {
      const res = await api.post("/api/twofactor/login-challenge", {
        temp_token: twoFactorState.tempToken,
        code,
      });

      const result = res?.data?.result;

      if (result?.access_token) {
        Cookies.set("access_token", result.access_token, {
          path: "/",
          expires: twoFactorState.rememberMe ? 7 : 1,
          sameSite: "lax",
        });

        if (twoFactorState.rememberMe) {
          localStorage.setItem("remember_me", "true");
        } else {
          localStorage.removeItem("remember_me");
        }

        try {
          const userRes = await api.get("/api/users");
          const profile =
            userRes.data?.result ||
            userRes.data?.data ||
            userRes.data?.user ||
            userRes.data;

          useAuthStore.setState({
            user: profile || null,
            isAuthenticated: true,
            isLoading: false,
            hasFetched: true,
          });

          if (profile) {
            localStorage.setItem("user-profile", JSON.stringify(profile));
          }
        } catch {
          useAuthStore.setState({
            isAuthenticated: true,
            isLoading: false,
            hasFetched: false,
          });
        }

        toast.success(t("Alert.login_success"));
        router.push(callbackUrl || "/dashboard");
      }
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      if (
        message?.toLowerCase().includes("too many") ||
        (error as { response?: { status?: number } })?.response?.status === 429
      ) {
        setTwoFactorError(t("auth.twoFactorTooMany"));
      } else {
        setTwoFactorError(t("auth.twoFactorError"));
      }
      setOtpCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleBackToLogin = () => {
    setTwoFactorState(null);
    setOtpCode(["", "", "", "", "", ""]);
    setTwoFactorError(null);
  };

  if (!isReady) return null;

  if (twoFactorState) {
    const codeComplete = otpCode.join("").length === 6;

    return (
      <div className="w-full">
        <AuthLogo />

        <button
          onClick={handleBackToLogin}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          {t("auth.backToLogin")}
        </button>

        <h1 className="text-2xl font-bold text-foreground mb-1">
          {t("auth.twoFactorTitle")}
        </h1>
        <p className="text-muted mb-8">{t("auth.twoFactorDesc")}</p>

        <div className="flex gap-2 justify-center mb-6">
          {otpCode.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(index, e)}
              onPaste={index === 0 ? handleOtpPaste : undefined}
              autoFocus={index === 0}
              className="w-12 h-14 text-center text-xl font-semibold rounded-xl border border-border bg-surface text-foreground focus:outline-none focus:ring-0 transition-all"
            />
          ))}
        </div>

        {twoFactorError && (
          <p className="text-sm text-red-500 text-center mb-4">
            {twoFactorError}
          </p>
        )}

        <Button
          type="button"
          onClick={handleVerify2FA}
          loading={isVerifying}
          disabled={!codeComplete}
          fullWidth
          size="md"
        >
          {t("auth.verifyCode")}
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <AuthLogo />

      <h1 className="text-2xl font-bold text-foreground mb-1">
        {t("auth.welcomeBack")}
      </h1>
      <p className="text-muted mb-8">{t("auth.signInToContinue")}</p>

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
          label={t("auth.email")}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email", {
            required: t("ErrorMessage.error_email"),
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: t("ErrorMessage.pattern_email"),
            },
          })}
        />

        <Input
          label={t("auth.password")}
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register("password", {
            required: t("ErrorMessage.error_password"),
          })}
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
            <input
              type="checkbox"
              className="rounded accent-primary"
              {...register("rememberMe")}
            />
            {t("auth.rememberMe")}
          </label>
          <Link
            href="/email-confirmation"
            className="text-sm text-primary hover:underline"
          >
            {t("auth.forgotPassword")}
          </Link>
        </div>

        <Button type="submit" loading={isLoading} fullWidth size="md">
          {t("auth.signIn")}
        </Button>
      </form>

      <p className="text-center text-sm text-muted mt-6">
        {t("auth.noAccount")}{" "}
        <Link
          href="/signup"
          className="text-primary hover:underline font-medium"
        >
          {t("auth.createOne")}
        </Link>
      </p>
    </div>
  );
}
