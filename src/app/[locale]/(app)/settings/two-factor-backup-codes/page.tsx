"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, Download, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui";
import { useRouter } from "@/i18n/routing";

const BACKUP_CODES_STORAGE_KEY = "two-factor-backup-codes";
const BACKUP_CODES_TTL_MS = 5 * 60 * 1000;

interface BackupCodesPayload {
	codes: string[];
	generatedAt: string;
}

function getBackupCodesFromSession(): string[] {
	if (typeof window === "undefined") {
		return [];
	}

	const raw = sessionStorage.getItem(BACKUP_CODES_STORAGE_KEY);
	if (!raw) {
		return [];
	}

	try {
		const parsed = JSON.parse(raw) as BackupCodesPayload;
		if (!Array.isArray(parsed.codes)) return [];

		const generatedAt = new Date(parsed.generatedAt).getTime();
		if (Date.now() - generatedAt > BACKUP_CODES_TTL_MS) {
			sessionStorage.removeItem(BACKUP_CODES_STORAGE_KEY);
			return [];
		}

		return parsed.codes;
	} catch {
		return [];
	}
}

function formatBackupCode(code: string): string {
	const normalized = code.replace(/[^a-zA-Z0-9]/g, "");
	if (normalized.length <= 4) {
		return normalized;
	}

	return `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
}

export default function TwoFactorBackupCodesPage() {
	const t = useTranslations("settings.security.backupCodesPage");
	const router = useRouter();
	const [codes] = useState<string[]>(() => getBackupCodesFromSession());

	const formattedCodes = useMemo(() => codes.map((code) => formatBackupCode(code)), [codes]);

	const handleCopyAll = async () => {
		if (!formattedCodes.length) return;

		try {
			await navigator.clipboard.writeText(formattedCodes.join("\n"));
			toast.success(t("copySuccess"));
		} catch {
			toast.error(t("copyError"));
		}
	};

	const handleDownload = () => {
		if (!formattedCodes.length) return;

		const content = [t("downloadWarning"), "", ...formattedCodes].join("\n");
		const file = new Blob([content], { type: "text/plain;charset=utf-8" });
		const url = URL.createObjectURL(file);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = "two-factor-backup-codes.txt";
		anchor.click();
		URL.revokeObjectURL(url);
		toast.success(t("downloadSuccess"));
	};

	return (
		<div className="min-h-screen bg-background py-8 px-4">
			<div className="max-w-4xl mx-auto space-y-6">
				<div>
					<h1 className="text-xl font-bold text-foreground">{t("title")}</h1>
					<p className="text-sm text-muted mt-1">{t("subtitle")}</p>
				</div>

				{formattedCodes.length ? (
					<>
						<div>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								{formattedCodes.map((code) => (
									<div
										key={code}
										className="rounded-lg border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground tracking-wide"
									>
										{code}
									</div>
								))}
							</div>

							<div className="flex flex-wrap gap-3 mt-6">
								<Button variant="outline" icon={<Download size={15} />} onClick={handleDownload}>
									{t("download")}
								</Button>
								<Button variant="outline" icon={<Copy size={15} />} onClick={handleCopyAll}>
									{t("copy")}
								</Button>
							</div>
						</div>
					</>
				) : (
					<div className="bg-surface border border-border rounded-lg p-6">
						<div className="flex items-start gap-3">
							<div className="w-9 h-9 rounded-full bg-yellow-500/15 text-yellow-500 flex items-center justify-center">
								<ShieldAlert size={18} />
							</div>
							<div>
								<p className="text-sm font-semibold text-foreground">{t("emptyTitle")}</p>
								<p className="text-sm text-muted mt-1">{t("emptyDesc")}</p>
							</div>
						</div>
					</div>
				)}

				<div>
					<Button variant="ghost" onClick={() => router.push("/settings/security")}>
						{t("backToSecurity")}
					</Button>
				</div>
			</div>
		</div>
	);
}
