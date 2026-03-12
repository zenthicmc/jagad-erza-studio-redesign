import { create } from "zustand";
import api from "@/lib/api";

export interface Collection {
	id: string;
	name: string;
	icon?: string;
	color?: string;
	description?: string;
	active?: boolean;
	user_id?: string;
	created_at?: string;
	modified_at?: string;
}

export interface ArticleType {
	name: string;
	active?: boolean;
	created_at?: string;
	created_by?: string;
	modified_at?: string;
	modified_by?: string;
}

interface CollectionState {
	collections: Collection[];
	articleTypes: ArticleType[];
	isLoading: boolean;
	articleTypesLoading: boolean;

	fetchCollections: () => Promise<void>;
	fetchArticleTypes: () => Promise<void>;

	createCollection: (payload: {
		name: string;
		icon?: string;
		color?: string;
		description?: string;
	}) => Promise<Collection>;

	updateCollection: (
		id: string,
		payload: {
			name?: string;
			icon?: string;
			color?: string;
			description?: string;
			active?: boolean;
		},
	) => Promise<void>;

	deleteCollection: (id: string) => Promise<void>;

	addItemToCollection: (
		collectionId: string,
		articleId: string,
	) => Promise<void>;
}

export const useCollectionStore = create<CollectionState>()((set, get) => ({
	collections: [],
	articleTypes: [],
	isLoading: false,
	articleTypesLoading: false,

	fetchCollections: async () => {
		set({ isLoading: true });
		try {
			const response = await api.get("/api/collections", {
				params: { page: 1, limit: 100, sort_by: "created_at", sort_dir: "desc" },
			});
			const collections = response.data?.result?.collections;
			if (collections && Array.isArray(collections)) {
				set({ collections });
			}
		} catch (error) {
			console.error("Failed to fetch collections", error);
		} finally {
			set({ isLoading: false });
		}
	},

	fetchArticleTypes: async () => {
		set({ articleTypesLoading: true });
		try {
			const response = await api.get("/api/article-types", {
				params: { page: 1, limit: 100, active: true },
			});
			const result = response.data?.result;
			const types = result?.article_types;
			if (types && Array.isArray(types)) {
				set({ articleTypes: types });
			}
		} catch (error) {
			console.error("Failed to fetch article types", error);
		} finally {
			set({ articleTypesLoading: false });
		}
	},

	createCollection: async (payload) => {
		const response = await api.post("/api/collections", payload);
		const newCollection = response.data?.result;

		await get().fetchCollections();

		return newCollection;
	},

	updateCollection: async (id, payload) => {
		await api.patch(`/api/collections/${id}`, payload);
		await get().fetchCollections();
	},

	deleteCollection: async (id) => {
		await api.delete(`/api/collections/${id}`);
		set((s) => ({
			collections: s.collections.filter((c) => c.id !== id),
		}));
	},

	addItemToCollection: async (collectionId, articleId) => {
		await api.post(`/api/articles/${articleId}/save`, {
			collection_id: collectionId,
		});
	},
}));
