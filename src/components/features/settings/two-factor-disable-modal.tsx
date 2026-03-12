"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, ShieldOff } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import Input from "@/components/ui/input";

interface TwoFactorDisableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (payload: { code?: string; backup_code?: string }) => void | Promise<void>;
  isLoading?: boolean;
  error?: string;
}

const OTP_LENGTH = 6;

export default function TwoFactorDisableModal({
  isOpen,
  onClose,
  onVerify,
  isLoading = false,
  error,
}: TwoFactorDisableModalProps) {
  const t = useTranslations("settings.security");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [digits, setDigits] = useState<string[]>(Array.from({ length: OTP_LENGTH }, () => ""));
  const [backupCode, setBackupCode] = useState("");
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (!useBackupCode) {
          inputRefs.current[0]?.focus();
        }
      }, 20);
      return () => clearTimeout(timer);
    }
  }, [isOpen, useBackupCode]);

  const handleClose = () => {
    setDigits(Array.from({ length: OTP_LENGTH }, () => ""));
    setBackupCode("");
    setUseBackupCode(false);
    onClose();
  };

  const otpCode = useMemo(() => digits.join(""), [digits]);

  useEffect(() => {
    if (!useBackupCode && otpCode.length === OTP_LENGTH && !isLoading) {
      onVerify({ code: otpCode });
    }
  }, [otpCode]);

  const setDigitAt = (index: number, value: string) => {
    setDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleChange = (index: number, value: string) => {
    const numeric = value.replace(/\D/g, "");
    if (!numeric) {
      setDigitAt(index, "");
      return;
    }

    const chars = numeric.slice(0, OTP_LENGTH).split("");
    setDigits((prev) => {
      const next = [...prev];
      let cursor = index;
      chars.forEach((char) => {
        if (cursor < OTP_LENGTH) {
          next[cursor] = char;
          cursor += 1;
        }
      });
      return next;
    });

    const nextIndex = Math.min(index + chars.length, OTP_LENGTH - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleKeyDown = (
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Backspace") {
      if (digits[index]) {
        setDigitAt(index, "");
        return;
      }
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
        setDigitAt(index - 1, "");
      }
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      inputRefs.current[index - 1]?.focus();
      return;
    }

    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      event.preventDefault();
      inputRefs.current[index + 1]?.focus();
      return;
    }

    if (event.key === "Enter" && otpCode.length === OTP_LENGTH && !isLoading) {
      onVerify({ code: otpCode });
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;

    const values = Array.from({ length: OTP_LENGTH }, (_, index) => pasted[index] || "");
    setDigits(values);
    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  const normalizeBackupCode = (code: string) =>
    code.trim();

  const handleVerify = () => {
    if (useBackupCode) {
      if (!backupCode.trim()) return;
      onVerify({ code: normalizeBackupCode(backupCode) });
    } else {
      if (otpCode.length !== OTP_LENGTH) return;
      onVerify({ code: otpCode });
    }
  };

  const handleSwitchMode = () => {
    setUseBackupCode((prev) => !prev);
    setDigits(Array.from({ length: OTP_LENGTH }, () => ""));
    setBackupCode("");
  };

  const isDisabled = useBackupCode
    ? !normalizeBackupCode(backupCode) || isLoading
    : otpCode.length !== OTP_LENGTH || isLoading;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t("disableConfirmTitle")}
      size="sm"
    >
      <div className="space-y-4">
        {useBackupCode ? (
          <Input
            label={t("backupCodeLabel")}
            type="text"
            value={backupCode}
            onChange={(e) => setBackupCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isDisabled) handleVerify();
            }}
            placeholder={t("backupCodePlaceholder")}
            error={error}
            autoFocus
          />
        ) : (
          <>
            <div className="flex items-center justify-center gap-2">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(node) => {
                    inputRefs.current[index] = node;
                  }}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(event) => handleChange(index, event.target.value)}
                  onKeyDown={(event) => handleKeyDown(index, event)}
                  onPaste={handlePaste}
                  className="w-11 h-12 text-center rounded-lg bg-surface border border-border text-foreground text-lg font-semibold focus:outline-none focus:ring-1 focus:ring-primary/25 focus:border-primary/50"
                  aria-label={`${t("otpDigitLabel")} ${index + 1}`}
                />
              ))}
            </div>

            {error ? <p className="text-xs text-red-500 text-center">{error}</p> : null}
          </>
        )}

        <Button
          variant="danger"
          fullWidth
          onClick={handleVerify}
          disabled={isDisabled}
          icon={isLoading ? <Loader2 size={16} className="animate-spin" /> : <ShieldOff size={16} />}
        >
          {t("verifyAndDisable")}
        </Button>

        <button
          type="button"
          onClick={handleSwitchMode}
          className="w-full text-center text-sm text-muted hover:text-foreground transition-colors"
        >
          {useBackupCode ? t("useAuthCodeInstead") : t("useBackupCodeInstead")}
        </button>
      </div>
    </Modal>
  );
}
