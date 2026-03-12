"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useAuthStore } from "@/stores/auth-store";
import { Save, Loader2, Upload, Trash2, Camera, Mail } from "lucide-react";
import Input from "@/components/ui/input";
import { Button, PhoneInput } from "@/components/ui";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import api from "@/lib/api";
import AvatarCropModal from "./avatar-crop-modal";

export default function ProfileTab() {
  const t = useTranslations("settings.profile");
  const user = useAuthStore((s) => s.user);

  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    user?.profile_image ?? null,
  );
  const [initialFullName, setInitialFullName] = useState(user?.full_name ?? "");
  const [initialPhone, setInitialPhone] = useState(user?.phone ?? "");
  const [initialAvatarPreview, setInitialAvatarPreview] = useState<string | null>(
    user?.profile_image ?? null,
  );
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  const applyProfileValues = useCallback(
    (profile: { full_name?: string; phone?: string; profile_image?: string | null }) => {
      const nextFullName = profile.full_name ?? "";
      const nextPhone = profile.phone ?? "";
      const nextAvatar = profile.profile_image ?? null;

      setFullName(nextFullName);
      setPhone(nextPhone);
      setAvatarPreview(nextAvatar);

      setInitialFullName(nextFullName);
      setInitialPhone(nextPhone);
      setInitialAvatarPreview(nextAvatar);
    },
    [],
  );

  useEffect(() => {
    if (!user) {
      return;
    }

    applyProfileValues(user);
    setIsProfileLoading(false);
  }, [user, applyProfileValues]);

  useEffect(() => {
    const fetchProfile = async () => {
      setIsProfileLoading(true);
      try {
        const res = await api.get("/api/users");
        const profile = res.data.result || res.data.data || res.data;
        if (profile) {
          applyProfileValues(profile);

          if (typeof profile.is_verified === "boolean")
            setIsVerified(profile.is_verified);

          useAuthStore.setState((state) => ({
            user: {
              ...state.user,
              ...profile,
              pending_email: "pending_email" in profile ? profile.pending_email : undefined,
            },
          }));
        }
      } catch {
        // fall back to auth store data
      } finally {
        setIsProfileLoading(false);
      }
    };
    fetchProfile();
  }, [applyProfileValues]);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fullNameError, setFullNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isChangeEmailModalOpen, setIsChangeEmailModalOpen] = useState(false);
  const [isEmailEditing, setIsEmailEditing] = useState(false);
  const [newEmail, setNewEmail] = useState(user?.email ?? "");
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarMenuRef = useRef<HTMLDivElement>(null);

  const initials = user?.full_name
    ? user.full_name
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
    : "U";

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        avatarMenuRef.current &&
        !avatarMenuRef.current.contains(e.target as Node)
      ) {
        setIsAvatarMenuOpen(false);
      }
    };
    if (isAvatarMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isAvatarMenuOpen]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const validTypes = ["image/jpeg", "image/png"];
      if (!validTypes.includes(file.type)) return;
      if (file.size > 2 * 1024 * 1024) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        setRawImageSrc(ev.target?.result as string);
        setIsCropModalOpen(true);
      };
      reader.readAsDataURL(file);

      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [],
  );

  const handleCropComplete = useCallback((croppedBlob: Blob) => {
    const file = new File([croppedBlob], "avatar.jpg", {
      type: "image/jpeg",
    });
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(croppedBlob));
  }, []);

  const handleRemovePhoto = useCallback(async () => {
    setIsAvatarMenuOpen(false);
    try {
      await api.delete("/api/users/photo");
      setAvatarPreview(null);
      setAvatarFile(null);
      setInitialAvatarPreview(null);
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        useAuthStore.setState({
          user: { ...currentUser, profile_image: undefined },
        });
      }
      setSaveMessage({ type: "success", text: t("saveSuccess") });
    } catch {
      setSaveMessage({ type: "error", text: t("saveError") });
    }
    setTimeout(() => setSaveMessage(null), 4000);
  }, [t]);

  const handleSave = async () => {
    if (!hasChanges) {
      return;
    }

    // Run full validation before submitting
    let valid = true;
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setFullNameError(t("validation.fullNameRequired"));
      valid = false;
    } else if (trimmedName.length < 3) {
      setFullNameError(t("validation.fullNameMin"));
      valid = false;
    } else if (trimmedName.length > 200) {
      setFullNameError(t("validation.fullNameMax"));
      valid = false;
    }

    if (!valid) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const formData = new FormData();
      formData.append("full_name", fullName);
      formData.append("phone", phone);
      if (avatarFile) {
        formData.append("profile_image", avatarFile);
      }
      if (isEmailEditing && newEmail.trim() !== (user?.email ?? "")) {
        formData.append("email", newEmail.trim());
      }

      const res = await api.patch("/api/users", formData);

      const updated = res.data.result || res.data.data || res.data;
      if (updated) {
        useAuthStore.setState((state) => ({
          user: { ...state.user, ...updated },
        }));

        const nextFullName = updated.full_name ?? fullName;
        const nextPhone = updated.phone ?? phone;
        const nextAvatar = updated.profile_image ?? avatarPreview ?? null;

        setFullName(nextFullName);
        setPhone(nextPhone);
        setAvatarPreview(nextAvatar);

        setInitialFullName(nextFullName);
        setInitialPhone(nextPhone);
        setInitialAvatarPreview(nextAvatar);
      }
      setAvatarFile(null);

      if (isEmailEditing && newEmail.trim() !== (user?.email ?? "")) {
        setSaveMessage({ type: "success", text: t("changeEmailSuccess") });
        setIsEmailEditing(false);
      } else {
        setSaveMessage({ type: "success", text: t("saveSuccess") });
      }
    } catch (err) {
      const axiosErr = err as import("axios").AxiosError<{ error?: string }>;
      const code = axiosErr.response?.data?.error;
      const errorKey = code ? `errors.${code}` : null;
      const msg = errorKey ? t(errorKey) : t("saveError");
      setSaveMessage({ type: "error", text: msg });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(null), 4000);
    }
  };

  const hasChanges =
    fullName.trim() !== initialFullName.trim() ||
    phone.trim() !== initialPhone.trim() ||
    avatarPreview !== initialAvatarPreview ||
    avatarFile !== null ||
    (isEmailEditing && newEmail.trim() !== (user?.email ?? ""));

  if (isProfileLoading) {
    return (
      <LoadingSkeleton heading={t("heading")} />
    );
  }

  const disabled = isSaving || !hasChanges || !!fullNameError;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">{t("heading")}</h2>
      </div>

      <div>
        <div className="flex flex-col-reverse lg:flex-row gap-8">
          <div className="w-full lg:w-1/2">
            <h3 className="text-sm font-semibold text-foreground mb-5">
              {t("basicInfo")}
            </h3>

            <div className="space-y-4 max-w-lg">
              <Input
                label={t("fullName")}
                value={fullName}
                onChange={(e) => {
                  const val = e.target.value;
                  setFullName(val);
                  const trimmed = val.trim();
                  if (!trimmed) {
                    setFullNameError(t("validation.fullNameRequired"));
                  } else if (trimmed.length < 3) {
                    setFullNameError(t("validation.fullNameMin"));
                  } else if (trimmed.length > 200) {
                    setFullNameError(t("validation.fullNameMax"));
                  } else {
                    setFullNameError(null);
                  }
                }}
                placeholder={t("fullName")}
                error={fullNameError ?? undefined}
              />

              <PhoneInput
                label={t("phoneNumber")}
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setPhoneError(null);
                }}
                error={phoneError ?? undefined}
              />

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">
                    {t("email")}
                  </label>
                  {!isEmailEditing && (
                    <div className="relative group">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsChangeEmailModalOpen(true)}
                        disabled={!!user?.provider}
                        className={user?.provider ? "opacity-50 cursor-not-allowed" : "hover:bg-transparent hover:text-primary"}
                      >
                        {t("changeEmail")}
                      </Button>
                      {user?.provider && (
                        <div className="absolute right-0 top-full mt-1 w-max max-w-[220px] px-3 py-2 bg-surface border border-border rounded-lg shadow-lg text-xs text-muted opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                          {t("changeEmailDisabledTooltip")}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {isEmailEditing ? (
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder={t("email")}
                    icon={<Mail size={16} />}
                  />
                ) : (
                  <Input
                    value={user?.email ?? ""}
                    readOnly
                    className="opacity-60 cursor-not-allowed"
                    hint={
                      user?.pending_email
                        ? t("pendingEmailLabel", { email: user.pending_email })
                        : isVerified
                          ? t("emailVerified")
                          : t("emailNotVerified")
                    }
                  />
                )}
              </div>
            </div>
          </div>
          <div ref={avatarMenuRef} className="mt-8 lg:mt-0">
            <h3 className="text-sm font-semibold text-foreground mb-4">
              {t("profilePhoto")}
            </h3>

            <div className="relative inline-block">
              <div className="w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 rounded-full bg-surface-hover border-2 border-border flex items-center justify-center overflow-hidden relative group">
                {avatarPreview ? (
                  <Image
                    src={avatarPreview}
                    alt="Avatar"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <span className="text-2xl font-bold text-muted">
                    {initials}
                  </span>
                )}
              </div>

              <button
                onClick={() => setIsAvatarMenuOpen((v) => !v)}
                className="absolute bottom-4 left-15 -translate-x-1/2 translate-y-1/2 flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface border border-border text-xs font-medium text-foreground hover:bg-surface-hover transition-colors shadow-sm whitespace-nowrap"
              >
                <Camera size={12} />
                {t("editPhoto")}
              </button>

              {isAvatarMenuOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-0 w-48 bg-surface border border-border rounded-lg shadow-xl z-20 overflow-hidden">
                  <button
                    onClick={() => {
                      setIsAvatarMenuOpen(false);
                      fileInputRef.current?.click();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-surface-hover transition-colors"
                  >
                    <Upload size={14} className="text-muted" />
                    {t("uploadPhoto")}
                  </button>
                  {avatarPreview && (
                    <button
                      onClick={handleRemovePhoto}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={14} />
                      {t("removePhoto")}
                    </button>
                  )}
                </div>
              )}
            </div>

            <p className="text-xs text-muted mt-6">{t("photoHint")}</p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mt-8">
          <Button
            variant={disabled ? "secondary" : "primary"}
            onClick={handleSave}
            disabled={disabled}
            icon={
              isSaving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )
            }
          >
            {t("saveProfile")}
          </Button>

          {saveMessage && (
            <span
              className={`text-sm font-medium ${saveMessage.type === "success" ? "text-green-500" : "text-red-500"
                }`}
            >
              {saveMessage.text}
            </span>
          )}
        </div>
      </div>


      {rawImageSrc && (
        <AvatarCropModal
          isOpen={isCropModalOpen}
          imageSrc={rawImageSrc}
          onClose={() => setIsCropModalOpen(false)}
          onCropComplete={handleCropComplete}
        />
      )}

      <ConfirmModal
        isOpen={isChangeEmailModalOpen}
        onClose={() => setIsChangeEmailModalOpen(false)}
        onConfirm={() => {
          setIsChangeEmailModalOpen(false);
          setIsEmailEditing(true);
          setNewEmail(user?.email ?? "");
        }}
        title={t("changeEmailTitle")}
        description={t("changeEmailDescription")}
        confirmLabel={t("changeEmailConfirm")}
        cancelLabel={t("changeEmailCancel")}
        variant="default"
      />
    </div>
  );
}

const LoadingSkeleton = ({ heading }: { heading: string }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">{heading}</h2>
      </div>

      <div>
        <div className="flex gap-8 animate-pulse">
          <div className="w-1/2 space-y-4 max-w-lg">
            <div className="h-4 w-28 rounded bg-surface" />
            <div className="h-11 w-full rounded-lg bg-surface" />
            <div className="h-11 w-full rounded-lg bg-surface" />
            <div className="h-11 w-full rounded-lg bg-surface" />
          </div>

          <div className="space-y-4">
            <div className="h-4 w-24 rounded bg-surface" />
            <div className="w-48 h-48 rounded-full bg-surface" />
            <div className="h-3 w-28 rounded bg-surface" />
          </div>
        </div>
      </div>
    </div>
  )
}