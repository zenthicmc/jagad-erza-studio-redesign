"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Save } from "lucide-react";
import { Modal, Button, Input } from "@/components/ui";
import { useCollectionStore } from "@/stores/collection-store";
import { handleFormApiError } from "@/lib/error-handler";
import toast from "react-hot-toast";
import {
	COLLECTION_ICON_OPTIONS,
	COLLECTION_COLOR_OPTIONS,
} from "@/components/features/collection/collection-folder-options";

interface CreateCollectionModalProps {
	isOpen: boolean;
	onClose: () => void;
	onCreated?: () => void;
	articleId?: string;
}

export function CreateCollectionModal({
	isOpen,
	onClose,
	onCreated,
	articleId,
}: CreateCollectionModalProps) {
	const t = useTranslations("collection");
	const tCommon = useTranslations("common");
	const tRoot = useTranslations();
	const { createCollection, addItemToCollection } = useCollectionStore();

	const [name, setName] = useState("");
	const [nameError, setNameError] = useState("");
	const [selectedIcon, setSelectedIcon] = useState("folder");
	const [selectedColor, setSelectedColor] = useState<string>(
		COLLECTION_COLOR_OPTIONS[0],
	);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async () => {
		if (!name.trim()) return;
		setNameError("");
		setIsSubmitting(true);
		try {
			const collectionsBefore = useCollectionStore.getState().collections;
			const existingIds = new Set(collectionsBefore.map((c) => c.id));

			await createCollection({
				name: name.trim(),
				icon: selectedIcon,
				color: selectedColor,
			});

			if (articleId) {
				const collectionsAfter = useCollectionStore.getState().collections;
				const newCollection = collectionsAfter.find((c) => !existingIds.has(c.id));

				if (newCollection) {
					try {
						await addItemToCollection(newCollection.id, articleId);
						toast.success(t("addedToCollection"));
					} catch {
						toast.success(t("createSuccess"));
						toast.error(t("addToCollectionError"));
					}
				} else {
					toast.success(t("createSuccess"));
				}
			} else {
				toast.success(t("createSuccess"));
			}

			onCreated?.();
			handleClose();
		} catch (err: unknown) {
			handleFormApiError(err, {
				setError: (_field: string, error: { message: string }) => {
					setNameError(error.message);
				},
				t: tRoot,
				fieldMap: { name: "name" },
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleClose = () => {
		setName("");
		setNameError("");
		setSelectedIcon("folder");
		setSelectedColor(COLLECTION_COLOR_OPTIONS[0]);
		onClose();
	};

	return (
		<Modal
			isOpen={isOpen}
			onClose={handleClose}
			title={t("createFolder")}
			size="sm"
			footer={
				<>
					<Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
						{tCommon("cancel")}
					</Button>
					<Button
						variant="primary"
						onClick={handleSubmit}
						icon={<Save size={16} />}
						disabled={!name.trim() || isSubmitting}
					>
						{isSubmitting ? tCommon("loading") : tCommon("create")}
					</Button>
				</>
			}
		>
			<div className="space-y-5">
				<div>
					<label className="block text-sm font-medium text-foreground mb-1.5">
						{t("folderName")}
					</label>
					<Input
						type="text"
						placeholder={t("folderNamePlaceholder")}
						value={name}
						onChange={(e) => {
							setName(e.target.value);
							if (nameError) setNameError("");
						}}
						fullWidth
						autoFocus
					/>
					{nameError && (
						<p className="text-xs text-red-500 mt-1">{nameError}</p>
					)}
				</div>

				<div>
					<label className="block text-sm font-medium text-foreground mb-2">
						{t("folderIcon")}
					</label>
					<div className="grid grid-cols-6 gap-2">
						{COLLECTION_ICON_OPTIONS.map(({ name: iconName, icon: Icon }) => (
							<button
								key={iconName}
								type="button"
								onClick={() => setSelectedIcon(iconName)}
								className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all ${selectedIcon === iconName
									? "bg-primary/15 text-primary ring-2 ring-primary/30"
									: "bg-surface-hover text-muted hover:text-foreground hover:bg-surface-hover/80"
									}`}
							>
								<Icon size={18} />
							</button>
						))}
					</div>
				</div>

				<div>
					<label className="block text-sm font-medium text-foreground mb-2">
						{t("folderColor")}
					</label>
					<div className="flex flex-wrap gap-2">
						{COLLECTION_COLOR_OPTIONS.map((color) => (
							<button
								key={color}
								type="button"
								onClick={() => setSelectedColor(color)}
								className={`w-8 h-8 rounded-full transition-all ${selectedColor === color
									? "ring-2 ring-offset-2 ring-offset-surface ring-primary scale-110"
									: "hover:scale-110"
									}`}
								style={{ backgroundColor: color }}
							/>
						))}
					</div>
				</div>
			</div>
		</Modal>
	);
}
