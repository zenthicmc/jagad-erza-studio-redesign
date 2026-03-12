"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Lock, Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import toast from "react-hot-toast";
import Input from "@/components/ui/input";
import { Button } from "@/components/ui";
import api from "@/lib/api";
import { getApiErrorCode } from "@/lib/error-handler";
import { useRouter } from "@/i18n/routing";
import { useAuthStore } from "@/stores/auth-store";
import PasswordConfirmModal from "./password-confirm-modal";
import TwoFactorSetupModal from "./two-factor-setup-modal";
import TwoFactorDisableModal from "./two-factor-disable-modal";

interface TwoFactorGenerateResult {
  qr_code_url?: string;
  secret?: string;
}

type TwoFactorAction = "enable" | "disable";

const BACKUP_CODES_STORAGE_KEY = "two-factor-backup-codes";

const SECURITY_ERROR_TRANSLATION_MAP: Record<string, string> = {
  invalid_credentials: "errors.invalid_credentials",
  invalid_code: "errors.invalid_code",
  invalid_otp: "errors.invalid_code",
  invalid_totp: "errors.invalid_code",
  bad_request: "errors.invalid_code",
  expired_code: "errors.expired_code",
  code_expired: "errors.expired_code",
  too_many_requests: "errors.too_many_requests",
  two_factor_already_enabled: "errors.two_factor_already_enabled",
  two_factor_not_enabled: "errors.two_factor_not_enabled",
};

export default function SecurityTab() {
  const t = useTranslations("settings.security");
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const refetchUser = useAuthStore((state) => state.refetchUser);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [is2FAEnabled, setIs2FAEnabled] = useState(() => user?.two_factor_enabled === true);
  const [isFetching2FAStatus, setIsFetching2FAStatus] = useState(false);
  const [pendingAction, setPendingAction] = useState<TwoFactorAction | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordModalLoading, setPasswordModalLoading] = useState(false);
  const [passwordModalError, setPasswordModalError] = useState<string | undefined>(undefined);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [setupVerifyLoading, setSetupVerifyLoading] = useState(false);
  const [setupVerifyError, setSetupVerifyError] = useState<string | undefined>(undefined);
  const [setupData, setSetupData] = useState<TwoFactorGenerateResult | null>(null);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disableLoading, setDisableLoading] = useState(false);
  const [disableError, setDisableError] = useState<string | undefined>(undefined);

  const resolveSecurityErrorMessage = useCallback(
    (error: unknown, fallback: string): string => {
      const code = getApiErrorCode(error);
      if (code) {
        const key = SECURITY_ERROR_TRANSLATION_MAP[code];
        if (key) {
          return t(key);
        }
      }

      return fallback;
    },
    [t],
  );

  const persistBackupCodes = useCallback((codes: string[]) => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(
      BACKUP_CODES_STORAGE_KEY,
      JSON.stringify({ codes, generatedAt: new Date().toISOString() }),
    );
  }, []);

  const fetchTwoFactorStatus = useCallback(async () => {
    setIsFetching2FAStatus(true);
    try {
      const res = await api.get("/api/users");
      const profile = res.data?.result || res.data?.data || res.data?.user || res.data;

      const enabled = profile?.two_factor_enabled === true;

      setIs2FAEnabled(enabled);
    } catch {
      setIs2FAEnabled(false);
    } finally {
      setIsFetching2FAStatus(false);
    }
  }, []);

  useEffect(() => {
    fetchTwoFactorStatus();
  }, [fetchTwoFactorStatus]);

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: t("errors.password_mismatch") });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMessage({ type: "error", text: t("errors.password_too_short") });
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordMessage(null);

    try {
      await api.patch("/api/users/password", {
        current_password: currentPassword,
        new_password: newPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage({ type: "success", text: t("passwordSuccess") });
    } catch (err) {
      setPasswordMessage({
        type: "error",
        text: resolveSecurityErrorMessage(err, t("passwordError")),
      });
    } finally {
      setIsUpdatingPassword(false);
      setTimeout(() => setPasswordMessage(null), 4000);
    }
  };

  const handleOpenActionModal = (action: TwoFactorAction) => {
    setPendingAction(action);
    if (action === "disable") {
      setDisableError(undefined);
      setShowDisableModal(true);
    } else {
      setPasswordModalError(undefined);
      setShowPasswordModal(true);
    }
  };

  const closeAllTwoFactorFlows = () => {
    setShowPasswordModal(false);
    setShowSetupModal(false);
    setShowDisableModal(false);
    setPasswordModalError(undefined);
    setSetupVerifyError(undefined);
    setDisableError(undefined);
    setPendingAction(null);
    setSetupData(null);
  };

  const handleDisableVerify = async (payload: { code?: string; }) => {
    setDisableLoading(true);
    setDisableError(undefined);

    try {
      await api.post("/api/twofactor/disable", payload);
      setIs2FAEnabled(false);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(BACKUP_CODES_STORAGE_KEY);
      }
      toast.success(t("disableSuccess"));
      closeAllTwoFactorFlows();
      await refetchUser();
    } catch (err) {
      setDisableError(resolveSecurityErrorMessage(err, t("errors.invalid_code")));
    } finally {
      setDisableLoading(false);
    }
  };

  const handlePasswordConfirmation = async (password: string) => {
    if (!pendingAction) return;

    setPasswordModalLoading(true);
    setPasswordModalError(undefined);

    try {

      const email = user?.email;
      if (!email) {
        throw new Error("missing_user_email");
      }

      await api.post("/api/auth/login", { email, password });
      const generateRes = await api.post("/api/twofactor/generate");

      const generated: TwoFactorGenerateResult =
        generateRes.data?.result || generateRes.data?.data || generateRes.data;

      if (!generated?.qr_code_url) {
        throw new Error("qr_unavailable");
      }

      setSetupData(generated);
      setShowPasswordModal(false);
      setShowSetupModal(true);
    } catch (err) {
      const fallback =
        pendingAction === "disable"
          ? t("disableError")
          : t("errors.password_verification_failed");

      setPasswordModalError(resolveSecurityErrorMessage(err, fallback));
    } finally {
      setPasswordModalLoading(false);
    }
  };

  const handleVerifyTwoFactor = async (code: string) => {
    setSetupVerifyLoading(true);
    setSetupVerifyError(undefined);

    try {
      const enableRes = await api.post("/api/twofactor/enable", { code });
      const enableData = enableRes.data?.result || enableRes.data?.data || enableRes.data;
      setIs2FAEnabled(true);

      if (enableData?.backup_codes?.length) {
        persistBackupCodes(enableData.backup_codes);
      }

      setShowSetupModal(false);
      setSetupData(null);
      toast.success(t("enableSuccess"));
      await refetchUser();
      router.push("/settings/two-factor-backup-codes");
    } catch (err) {
      setSetupVerifyError(resolveSecurityErrorMessage(err, t("errors.invalid_code")));
    } finally {
      setSetupVerifyLoading(false);
    }
  };

  const disabledPassword = isUpdatingPassword || !currentPassword || !newPassword || !confirmPassword;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">{t("heading")}</h2>
      </div>

      <div>
        <h3 className="text-md font-semibold text-foreground mb-5">
          {t("passwordSetting")}
        </h3>

        <div className="space-y-4 max-w-lg">
          {/* Hidden fields to prevent browser from autofilling visible inputs */}
          <input type="text" name="fake-user" autoComplete="username" hidden />
          <input type="password" name="fake-pass" autoComplete="current-password" hidden />

          <Input
            label={t("currentPassword")}
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
            icon={<Lock size={16} />}
            autoComplete="off"
            name="security-current-pw"
          />

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <Input
              label={t("newPassword")}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              icon={<Lock size={16} />}
              autoComplete="new-password"
              name="security-new-pw"
            />

            <Input
              label={t("confirmPassword")}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              icon={<Lock size={16} />}
              autoComplete="new-password"
              name="security-confirm-pw"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mt-6">
          <Button
            size="md"
            variant={disabledPassword ? "secondary" : "primary"}
            onClick={handleUpdatePassword}
            disabled={disabledPassword}
            className="shadow-none"
            icon={
              isUpdatingPassword ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Lock size={16} />
              )
            }
          >
            {t("updatePassword")}
          </Button>

          {passwordMessage && (
            <span
              className={`text-sm font-medium ${passwordMessage.type === "success"
                ? "text-green-500"
                : "text-red-500"
                }`}
            >
              {passwordMessage.text}
            </span>
          )}
        </div>
      </div>

      <div className="border border-t border-border"></div>

      <div>
        <h3 className="text-md font-semibold text-foreground mb-1">
          {t("twoFactor")}
        </h3>
        <p className="text-sm text-muted mb-5">{t("twoFactorDesc")}</p>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-surface border border-border rounded-xl px-5 py-4">
          <div className="flex items-center gap-3">
            {is2FAEnabled ? (
              <div className="w-10 h-10 rounded-full bg-green-500/15 flex items-center justify-center">
                <ShieldCheck size={20} className="text-green-500" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-yellow-500/15 flex items-center justify-center">
                <ShieldOff size={20} className="text-yellow-500" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-foreground">
                {t("twoFactorStatus")}
              </p>
              <p
                className={`text-xs font-medium mt-0.5 ${is2FAEnabled ? "text-green-500" : "text-yellow-500"
                  }`}
              >
                {isFetching2FAStatus
                  ? t("checkingStatus")
                  : is2FAEnabled
                    ? t("activated")
                    : t("notActivated")}
              </p>
            </div>
          </div>

          <Button
            variant={is2FAEnabled ? "danger" : "primary"}
            size="sm"
            onClick={() => handleOpenActionModal(is2FAEnabled ? "disable" : "enable")}
            disabled={isFetching2FAStatus}
          >
            {is2FAEnabled ? t("disable") : t("enable")}
          </Button>
        </div>

        {is2FAEnabled ? (
          <div className="mt-4 bg-surface border border-border rounded-xl px-5 py-4">
            <h4 className="text-sm font-semibold text-foreground">{t("recoveryCodesTitle")}</h4>
            <p className="text-sm text-muted mt-1">{t("recoveryCodesDesc")}</p>

            <div className="mt-4 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push("/settings/two-factor-backup-codes")}
              >
                {t("view")}
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {showPasswordModal ? (
        <PasswordConfirmModal
          isOpen={showPasswordModal}
          onClose={() => {
            setShowPasswordModal(false);
            setPasswordModalError(undefined);
            setPendingAction(null);
          }}
          onConfirm={handlePasswordConfirmation}
          isLoading={passwordModalLoading}
          error={passwordModalError}
        />
      ) : null}

      {showDisableModal ? (
        <TwoFactorDisableModal
          isOpen={showDisableModal}
          onClose={() => {
            setShowDisableModal(false);
            setDisableError(undefined);
            setPendingAction(null);
          }}
          onVerify={handleDisableVerify}
          isLoading={disableLoading}
          error={disableError}
        />
      ) : null}

      {showSetupModal ? (
        <TwoFactorSetupModal
          isOpen={showSetupModal}
          onClose={closeAllTwoFactorFlows}
          qrCodeUrl={setupData?.qr_code_url}
          onVerify={handleVerifyTwoFactor}
          isLoading={setupVerifyLoading}
          error={setupVerifyError}
        />
      ) : null}
    </div>
  );
}
