"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import QRCode from "qrcode";

interface TwoFactorSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrCodeUrl?: string;
  onVerify: (code: string) => void | Promise<void>;
  isLoading?: boolean;
  error?: string;
}

const OTP_LENGTH = 6;

export default function TwoFactorSetupModal({
  isOpen,
  onClose,
  qrCodeUrl,
  onVerify,
  isLoading = false,
  error,
}: TwoFactorSetupModalProps) {
  const t = useTranslations("settings.security");
  const [digits, setDigits] = useState<string[]>(Array.from({ length: OTP_LENGTH }, () => ""));
  const [renderedQrSrc, setRenderedQrSrc] = useState<string>("");
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 20);

    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    let active = true;

    const buildQr = async () => {
      if (!qrCodeUrl) {
        if (active) setRenderedQrSrc("");
        return;
      }

      if (qrCodeUrl.startsWith("otpauth://")) {
        try {
          const dataUrl = await QRCode.toDataURL(qrCodeUrl, {
            width: 320,
            margin: 1,
          });
          if (active) setRenderedQrSrc(dataUrl);
          return;
        } catch {
          if (active) setRenderedQrSrc("");
          return;
        }
      }

      if (active) setRenderedQrSrc(qrCodeUrl);
    };

    buildQr();

    return () => {
      active = false;
    };
  }, [qrCodeUrl]);

  const otpCode = useMemo(() => digits.join(""), [digits]);

  useEffect(() => {
    if (otpCode.length === OTP_LENGTH && !isLoading) {
      onVerify(otpCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      onVerify(otpCode);
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("setup2FATitle")}
      description={t("setup2FADesc")}
      size="lg"
    >
      <div className="space-y-6">
        <div className="rounded-lg p-4">
          <p className="text-xs font-semibold text-primary">{t("step1")}</p>
          <p className="text-sm text-foreground mt-1">{t("scanQrInstruction")}</p>

          <div className="mt-4 rounded-lg p-4 flex justify-center">
            {renderedQrSrc ? (
              <img
                src={renderedQrSrc}
                alt={t("qrCodeAlt")}
                className="w-48 h-48 rounded-md"
              />
            ) : (
              <p className="text-sm text-muted">{t("qrUnavailable")}</p>
            )}
          </div>
        </div>

        <div className="p-4">
          <p className="text-xs font-semibold text-primary">{t("step2")}</p>
          <p className="text-sm text-foreground mt-1">{t("otpInstruction")}</p>

          <div className="mt-4 flex items-center justify-center gap-2">
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

          {error ? <p className="text-xs text-red-500 mt-3 text-center">{error}</p> : null}
        </div>

        <Button
          variant="primary"
          fullWidth
          onClick={() => onVerify(otpCode)}
          disabled={otpCode.length !== OTP_LENGTH || isLoading}
          icon={isLoading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
        >
          {t("verifyCode")}
        </Button>
      </div>
    </Modal>
  );
}
