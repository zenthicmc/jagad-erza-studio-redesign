import { create } from "zustand";
import api from "@/lib/api";
import Cookies from "js-cookie";

export interface CmsConnection {
	id: string;
	cms_name: string; // "wordpress" | "blogger"
	site_name: string;
	site_url: string;
	connection_status: string;
	created_at: string;
	created_by: string;
	modified_at: string;
	modified_by: string;
}

export interface CmsConnectionDetail {
	id: string;
	cms_name: string;
	site_name: string;
	site_url: string;
	auth_type: string;
	connection_status: string;
	user_role: string;
	created_at: string;
	created_by: string;
	modified_at: string;
	modified_by: string;
}

export interface ConnectWordPressPayload {
	site_url: string;
	username: string;
	application_password: string;
	cms_name: string;
}

export interface ConnectWordPressResult {
	id: string;
	cms_name: string;
	site_url: string;
	user_role: string;
	connection_status: string;
}

// CMS - Post types

export interface WPAuthorItem {
	id: number;
	name: string;
	slug: string;
}

export interface WPCategoryItem {
	id: number;
	name: string;
	slug: string;
}

export interface PublishToWordPressPayload {
	article_id: string;
	connection_id: string;
	slug?: string;
	excerpt?: string;
	post_status?: "draft" | "publish";
	author_id?: number;
	category_ids?: number[];
	tags?: string[];
	featured_image?: File | null;
}

export interface PublishToWordPressResult {
	publish_id: string;
	external_post_id: string;
	external_post_url: string;
	publish_status: string;
}

const API_BASE_URL = "https://api.dev.erza.ai";

function isForbiddenAxios(err: any): boolean {
	return err?.response?.status === 403;
}

interface IntegrationState {
	connections: CmsConnection[];
	isLoading: boolean;
	fetchError: string | null;

	fetchConnections: () => Promise<void>;
	connectWordPress: (payload: ConnectWordPressPayload) => Promise<ConnectWordPressResult>;
	getConnectionDetail: (id: string) => Promise<CmsConnectionDetail>;
	disconnectCms: (id: string) => Promise<void>;

	// CMS - Post
	fetchWPAuthors: (connectionId: string) => Promise<WPAuthorItem[]>;
	fetchWPCategories: (connectionId: string) => Promise<WPCategoryItem[]>;
	publishToWordPress: (payload: PublishToWordPressPayload) => Promise<PublishToWordPressResult>;
}

export const useIntegrationStore = create<IntegrationState>()((set, get) => ({
	connections: [],
	isLoading: false,
	fetchError: null,

	fetchConnections: async () => {
		set({ isLoading: true, fetchError: null });
		try {
			const response = await api.get("/api/cms/connections", {
				params: { page: 1, limit: 100, sort_by: "created_at", sort_dir: "DESC" },
			});
			const connections: CmsConnection[] = response.data?.result?.connections ?? response.data?.connections ?? [];
			set({ connections });
		} catch (error) {
			console.error("Failed to fetch CMS connections", error);
			set({ fetchError: "Failed to load connections. Please try again." });
		} finally {
			set({ isLoading: false });
		}
	},

	connectWordPress: async (payload) => {
		const response = await api.post("/api/cms/connect/wordpress", payload);
		const result: ConnectWordPressResult = response.data?.result;

		await get().fetchConnections();
		return result;
	},

	getConnectionDetail: async (id) => {
		try {
			const response = await api.get(`/api/cms/connections/${id}`);
			return response.data?.result as CmsConnectionDetail;
		} catch (err) {
			if (isForbiddenAxios(err)) {
				throw new Error("forbidden");
			}
			throw err;
		}
	},

	disconnectCms: async (id) => {
		await api.delete(`/api/cms/connections/${id}`);
		set((s) => ({
			connections: s.connections.filter((c) => c.id !== id),
		}));
	},

	fetchWPAuthors: async (connectionId) => {
		try {
			const response = await api.get(`/api/posts/wordpress/connections/${connectionId}/authors`);
			return (response.data?.result ?? []) as WPAuthorItem[];
		} catch (err) {
			if (isForbiddenAxios(err)) {
				throw new Error("forbidden");
			}
			throw err;
		}
	},

	fetchWPCategories: async (connectionId) => {
		try {
			const response = await api.get(`/api/posts/wordpress/connections/${connectionId}/categories`);
			return (response.data?.result ?? []) as WPCategoryItem[];
		} catch (err) {
			if (isForbiddenAxios(err)) {
				throw new Error("forbidden");
			}
			throw err;
		}
	},

	publishToWordPress: async (payload) => {
		const token = Cookies.get("access_token");
		const formData = new FormData();

		formData.append("article_id", payload.article_id);
		formData.append("connection_id", payload.connection_id);
		if (payload.slug) formData.append("slug", payload.slug);
		if (payload.excerpt) formData.append("excerpt", payload.excerpt);
		if (payload.post_status) formData.append("post_status", payload.post_status);
		if (payload.author_id != null) formData.append("author_id", String(payload.author_id));
		if (payload.category_ids?.length) {
			payload.category_ids.forEach((id) => formData.append("category_ids", String(id)));
		}
		if (payload.tags?.length) {
			payload.tags.forEach((tag) => formData.append("tags", tag));
		}
		if (payload.featured_image) {
			formData.append("featured_image", payload.featured_image);
		}

		const response = await fetch(`${API_BASE_URL}/api/posts/wordpress/publish`, {
			method: "POST",
			headers: {
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
			body: formData,
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			if (response.status === 403) {
				throw new Error("forbidden");
			}
			const serverMessage = errorData?.error ?? errorData?.message ?? `Publish failed: ${response.status}`;
			console.error("publishToWordPress server error:", serverMessage);
			throw new Error("publish_failed");
		}

		const data = await response.json();
		return data?.result as PublishToWordPressResult;
	},
}));
