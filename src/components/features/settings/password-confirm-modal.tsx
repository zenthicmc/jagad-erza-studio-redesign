"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Modal, Button, Input } from "@/components/ui";

interface PasswordConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void | Promise<void>;
  isLoading?: boolean;
  error?: string;
}

export default function PasswordConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  error,
}: PasswordConfirmModalProps) {
  const t = useTranslations("settings.security");
  const [password, setPassword] = useState("");

  const handleConfirm = () => {
    if (!password.trim()) return;
    onConfirm(password);
  };

  const handleClose = () => {
    if (isLoading) return;
    setPassword("");
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && password.trim() && !isLoading) {
      handleConfirm();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t("confirmPasswordTitle")}
      size="sm"
    >
      <div className="space-y-4">
        <Input
          label={t("passwordLabel")}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="••••••••"
          error={error}
          autoFocus
          autoComplete="off"
        />

        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={!password.trim() || isLoading}
            icon={isLoading ? <Loader2 size={14} className="animate-spin" /> : undefined}
          >
            {t("confirm")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
