"use client";

import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { useTranslations } from "next-intl";
import { ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { Modal, Button } from "@/components/ui";

interface AvatarCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedBlob: Blob) => void;
}

function createCroppedImage(
  imageSrc: string,
  pixelCrop: Area,
  rotation: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));

      const radians = (rotation * Math.PI) / 180;
      const sin = Math.abs(Math.sin(radians));
      const cos = Math.abs(Math.cos(radians));
      const rotW = image.width * cos + image.height * sin;
      const rotH = image.width * sin + image.height * cos;

      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;

      ctx.translate(-pixelCrop.x, -pixelCrop.y);
      ctx.translate(rotW / 2, rotH / 2);
      ctx.rotate(radians);
      ctx.translate(-image.width / 2, -image.height / 2);
      ctx.drawImage(image, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to create blob"));
        },
        "image/jpeg",
        0.92,
      );
    };
    image.onerror = reject;
    image.src = imageSrc;
  });
}

export default function AvatarCropModal({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
}: AvatarCropModalProps) {
  const t = useTranslations("settings.profile");

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const onCropAreaChange = useCallback(
    (_croppedArea: Area, croppedPixels: Area) => {
      setCroppedAreaPixels(croppedPixels);
    },
    [],
  );

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setIsSaving(true);
    try {
      const blob = await createCroppedImage(
        imageSrc,
        croppedAreaPixels,
        rotation,
      );
      onCropComplete(blob);
      onClose();
    } catch (err) {
      console.error("Crop failed:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("cropTitle")}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cropCancel")}
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleConfirm}
            disabled={isSaving}
          >
            {t("cropConfirm")}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="relative w-full h-[300px] bg-black/90 rounded-lg overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropAreaChange}
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 flex-1">
            <ZoomOut size={16} className="text-muted shrink-0" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-primary h-1.5"
            />
            <ZoomIn size={16} className="text-muted shrink-0" />
          </div>

          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="p-2 rounded-lg hover:bg-surface-hover text-muted hover:text-foreground transition-colors"
            title={t("cropRotate")}
          >
            <RotateCw size={16} />
          </button>
        </div>
      </div>
    </Modal>
  );
}
