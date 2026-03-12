"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { navigateWithOrigin } from "@/hooks/use-back-navigation";
import { useTranslations } from "next-intl";
import {
  Search,
  RotateCcw,
  FileText,
  Calendar,
  Heart,
  Folder,
  Star,
  Bookmark,
  Tag,
  Zap,
  Award,
  Flag,
  Music,
  Camera,
  Coffee,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  Save,
} from "lucide-react";
import api from "@/lib/api";

import { useCollectionStore, type Collection } from "@/stores/collection-store";
import type { ArticleGeneration } from "@/stores/article-store";
import { Button, Input, Spinner, Select, ConfirmModal, Modal } from "@/components/ui";
import { useAuth } from "@/hooks/use-auth";
import { ArticleCard } from "./article-card";
import { CategoryTabs, type Category } from "./category-tabs";
import { CreateCollectionModal } from "./create-collection-modal";
import { EditCollectionModal } from "./edit-collection-modal";
import toast from "react-hot-toast";

interface ArticleFilters {
  title: string;
  page: number;
  limit: number;
  sort_by: "modified_at" | "created_at" | "title";
  sort_dir: "asc" | "desc";
  article_type?: string;
  active?: boolean;
}

interface ArticleMetadata {
  total_page: number;
  total_data: number;
}

interface ArticleTypeOption {
  label: string;
  value: string;
}

interface StatusOption {
  label: string;
  value: string;
}

const TAB_PARAM = "tab";

export function CollectionPage() {
  const t = useTranslations("collection");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const {
    collections,
    articleTypes,
    fetchCollections,
    fetchArticleTypes,
    deleteCollection: deleteCollectionApi,
  } = useCollectionStore();

  const effectiveIsAuthenticated = isAuthLoading || isAuthenticated;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [articles, setArticles] = useState<ArticleGeneration[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFolderSwitching, setIsFolderSwitching] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const iconMap: Record<string, React.ReactNode> = {
    folder: <Folder className="w-4 h-4" />,
    star: <Star className="w-4 h-4" />,
    heart: <Heart className="w-4 h-4" />,
    bookmark: <Bookmark className="w-4 h-4" />,
    tag: <Tag className="w-4 h-4" />,
    zap: <Zap className="w-4 h-4" />,
    award: <Award className="w-4 h-4" />,
    flag: <Flag className="w-4 h-4" />,
    "file-text": <FileText className="w-4 h-4" />,
    music: <Music className="w-4 h-4" />,
    camera: <Camera className="w-4 h-4" />,
    coffee: <Coffee className="w-4 h-4" />,
  };

  const categories: Category[] = [
    {
      id: "all",
      label: t("all"),
      icon: <Folder className="w-4 h-4" />,
      isDefault: true,
    },
    {
      id: "favorite",
      label: t("favorite"),
      icon: <Heart className="w-4 h-4" />,
      isDefault: true,
    },
    ...collections.map((c) => ({
      id: c.id,
      label: c.name,
      icon: iconMap[c.icon || "folder"] || <Folder className="w-6 h-6" />,
      color: c.color,
      isDefault: false,
    })),
  ];

  const collectionIds = useMemo(
    () => new Set(collections.map((c) => c.id)),
    [collections],
  );
  const tabParam = searchParams.get(TAB_PARAM);
  const activeCategory =
    tabParam === "all" || tabParam === "favorite" || (tabParam && collectionIds.has(tabParam))
      ? (tabParam || "all")
      : "all";

  const setTab = useCallback(
    (categoryId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(TAB_PARAM, categoryId);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    if (tabParam && tabParam !== "all" && tabParam !== "favorite" && !collectionIds.has(tabParam)) {
      setTab("all");
    }
  }, [tabParam, collectionIds, setTab]);

  const [filters, setFilters] = useState<ArticleFilters>({
    title: "",
    page: 1,
    limit: 10,
    sort_by: "modified_at",
    sort_dir: "desc",
  });

  const [metadata, setMetadata] = useState<ArticleMetadata>({
    total_page: 1,
    total_data: 0,
  });

  const activeCategoryRef = useRef(activeCategory);
  const prevActiveCategoryRef = useRef(activeCategory);
  const filtersRef = useRef(filters);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    if (prevActiveCategoryRef.current !== activeCategory) {
      setIsFolderSwitching(true);
      setArticles([]);
      setMetadata({ total_page: 1, total_data: 0 });
      setFilters((prev) => ({ ...prev, page: 1 }));
      prevActiveCategoryRef.current = activeCategory;
    }
    activeCategoryRef.current = activeCategory;
  }, [activeCategory]);

  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setFilters((prev) => ({ ...prev, page: 1, title: searchTerm }));
    }, 500);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    if (!filterOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [filterOpen]);

  const fetchArticles = useCallback(async () => {
    const currentFilters = filtersRef.current;
    const categoryForThisRequest = activeCategory;

    setLoading(true);

    if (categoryForThisRequest === "favorite") {
      setArticles([]);
      setMetadata({ total_page: 1, total_data: 0 });
      setLoading(false);
      setIsFolderSwitching(false);
      return;
    }

    const hasClientFilter = !!(currentFilters.title?.trim() || currentFilters.article_type || currentFilters.sort_by === "title");

    try {
      const statusParam =
        currentFilters.active === undefined
          ? undefined
          : currentFilters.active
            ? "posted"
            : "draft";

      const endpoint =
        categoryForThisRequest === "all"
          ? "/api/collections/items"
          : `/api/collections/${categoryForThisRequest}/items`;

      const response = await api.get(endpoint, {
        params: {
          page: hasClientFilter ? 1 : currentFilters.page,
          limit: hasClientFilter ? 1000 : currentFilters.limit,
          sort_by: "created_at",
          sort_dir: currentFilters.sort_by === "title" ? "desc" : currentFilters.sort_dir,
          ...(statusParam && { status: statusParam }),
        },
      });

      if (response.data?.result) {
        if (activeCategoryRef.current !== categoryForThisRequest) {
          return;
        }
        const res = response.data.result;
        const items = res.items || [];

        let mappedArticles: ArticleGeneration[] = items
          .map((item: any) => {
            const owner = item.owner_detail;
            if (!owner) return null;

            return {
              id: owner.id,
              status: owner.status,
              content: owner.content,
              title: owner.title,
              article_type_name: owner.article_type || owner.article_type_name,
              created_at: item.created_at || owner.created_at,
              active: owner.active,
              article_collection_id: item.id,
            };
          })
          .filter(Boolean) as ArticleGeneration[];

        const seen = new Set<string>();
        mappedArticles = mappedArticles.filter((a) => {
          if (seen.has(a.id)) return false;
          seen.add(a.id);
          return true;
        });

        const searchLower = currentFilters.title?.trim().toLowerCase() || "";
        if (searchLower) {
          mappedArticles = mappedArticles.filter((a) =>
            a.title?.toLowerCase().includes(searchLower),
          );
        }
        if (currentFilters.article_type) {
          mappedArticles = mappedArticles.filter(
            (a) => (a.article_type_name || "") === currentFilters.article_type,
          );
        }
        if (statusParam) {
          mappedArticles = mappedArticles.filter(
            (a) => (a.status || "") === statusParam,
          );
        }

        mappedArticles.sort((a, b) => {
          const direction = currentFilters.sort_dir === "asc" ? 1 : -1;

          if (currentFilters.sort_by === "title") {
            const aTitle = (a.title || "").toLowerCase();
            const bTitle = (b.title || "").toLowerCase();
            if (aTitle < bTitle) return -1 * direction;
            if (aTitle > bTitle) return 1 * direction;
            return 0;
          }

          const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;

          if (aTime === bTime) return 0;
          return aTime < bTime ? -1 * direction : 1 * direction;
        });

        if (hasClientFilter) {
          const totalFiltered = mappedArticles.length;
          const totalPages = Math.max(1, Math.ceil(totalFiltered / currentFilters.limit));
          const start = (currentFilters.page - 1) * currentFilters.limit;
          const pageItems = mappedArticles.slice(start, start + currentFilters.limit);
          setArticles(pageItems);
          setMetadata({ total_page: totalPages, total_data: totalFiltered });
        } else {
          setArticles(mappedArticles);
          setMetadata({
            total_page: res.total_page || 1,
            total_data: res.total_data ?? mappedArticles.length,
          });
        }
      }
    } catch (error: unknown) {
      if (activeCategoryRef.current === categoryForThisRequest) {
        console.error("Failed to fetch articles:", error);
        toast.error(t("errorFetch"));
      }
    } finally {
      setLoading(false);
      setIsFolderSwitching(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles, filters, debouncedSearch]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  useEffect(() => {
    fetchArticleTypes();
  }, [fetchArticleTypes]);

  const typeOptions: ArticleTypeOption[] = useMemo(
    () => [
      { label: t("allType"), value: "" },
      ...articleTypes.map((at) => ({
        label: at.name.charAt(0).toUpperCase() + at.name.slice(1).toLowerCase(),
        value: at.name,
      })),
    ],
    [t, articleTypes],
  );

  const statusOptions: StatusOption[] = useMemo(
    () => [
      { label: t("allStatus"), value: "" },
      { label: t("draft"), value: "draft" },
      { label: t("published"), value: "posted" },
    ],
    [t],
  );

  const handleTypeChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      article_type: value || undefined,
      page: 1,
    }));
  };

  const handleStatusChange = (value: string) => {
    let active: boolean | undefined = undefined;
    if (value === "posted") active = true;
    if (value === "draft") active = false;

    setFilters((prev) => ({
      ...prev,
      active,
      page: 1,
    }));
  };

  const handleDateSort = () => {
    setFilters((prev) => {
      const switchingToDate = prev.sort_by !== "modified_at";
      return {
        ...prev,
        sort_by: "modified_at",
        sort_dir:
          switchingToDate
            ? "asc"
            : prev.sort_dir === "desc"
              ? "asc"
              : "desc",
        page: 1,
      };
    });
  };

  const handleTitleSort = () => {
    setFilters((prev) => ({
      ...prev,
      sort_by: "title",
      sort_dir:
        prev.sort_by === "title" && prev.sort_dir === "asc" ? "desc" : "asc",
      page: 1,
    }));
  };

  const resetFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setTab("all");
    setFilters({
      title: "",
      page: 1,
      limit: 10,
      sort_by: "modified_at",
      sort_dir: "desc",
      article_type: undefined,
      active: undefined,
    });
  };

  const getEditPath = (article: ArticleGeneration): string => {
    const type = (article.article_type_name || "").toLowerCase();
    const id = article.id;
    if (type === "humanize") return `/ai-tools/humanize/${id}`;
    if (type === "paraphrase") return `/ai-tools/paraphrase/${id}`;
    if (type === "grammar") return `/ai-tools/grammar-correction/${id}`;
    if (type === "detector") return `/ai-tools/ai-detector/${id}`;
    if (type === "common" || type === "assistant") return `/ai-tools/writing-assistant/${id}`;
    if (["listicle", "longform", "news", "faq"].includes(type))
      return `/article/${type}/${id}`;
    return `/article/${article.article_type_name || "listicle"}/${id}`;
  };

  const handleEdit = (article: ArticleGeneration) => {
    navigateWithOrigin(router, getEditPath(article));
  };

  const handlePost = (article: ArticleGeneration) => {
    const type = (article.article_type_name || "listicle").toLowerCase();
    navigateWithOrigin(router, `/article/${type}/${article.id}/post`);
  };

  const [deleteArticleTarget, setDeleteArticleTarget] = useState<ArticleGeneration | null>(null);
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = (article: ArticleGeneration) => {
    setDeleteArticleTarget(article);
  };

  const confirmDeleteArticle = async () => {
    if (!deleteArticleTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/api/articles/${deleteArticleTarget.id}`);
      toast.success(tCommon("deleteSuccess"));
      fetchArticles();
    } catch (error) {
      console.error("Failed to delete article:", error);
      toast.error(tCommon("deleteError"));
    } finally {
      setIsDeleting(false);
      setDeleteArticleTarget(null);
    }
  };

  const [renameArticleTarget, setRenameArticleTarget] = useState<ArticleGeneration | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  const handleRename = (article: ArticleGeneration) => {
    setRenameTitle(article.title || "");
    setRenameArticleTarget(article);
  };

  const confirmRenameArticle = async () => {
    if (!renameArticleTarget || !renameTitle.trim()) return;
    setIsRenaming(true);
    try {
      await api.patch(`/api/articles/${renameArticleTarget.id}`, {
        title: renameTitle.trim(),
      });
      toast.success(t("renameSuccess"));
      fetchArticles();
      setRenameArticleTarget(null);
    } catch (error) {
      console.error("Failed to rename article:", error);
      toast.error(t("renameError"));
    } finally {
      setIsRenaming(false);
    }
  };

  const handleCreateNew = () => {
    router.push("/article");
  };

  const handleCategorySelect = (categoryId: string) => {
    setTab(categoryId);
  };

  const handleEditCategory = (categoryId: string) => {
    const collection = collections.find((c) => c.id === categoryId);
    if (!collection) return;
    setEditingCollection(collection);
  };

  const handleDeleteCategory = (categoryId: string) => {
    setDeleteCategoryTarget(categoryId);
  };

  const confirmDeleteCategory = async () => {
    if (!deleteCategoryTarget) return;
    setIsDeleting(true);
    try {
      await deleteCollectionApi(deleteCategoryTarget);
      if (activeCategory === deleteCategoryTarget) {
        setTab("all");
      }
      toast.success(t("deleteSuccess"));
    } catch {
      toast.error(t("createError"));
    } finally {
      setIsDeleting(false);
      setDeleteCategoryTarget(null);
    }
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-6">
            {t("collection")}
          </h1>

          <div className="flex items-center gap-2 mb-6">
            <div className="flex-1 min-w-0">
              <Input
                type="text"
                placeholder={t("search")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search className="w-4 h-4" />}
                fullWidth
              />
            </div>

            <div ref={filterRef} className="relative shrink-0">
              <Button
                variant={
                  filters.article_type || filters.active !== undefined
                    ? "primary"
                    : "secondary"
                }
                size="sm"
                onClick={() => setFilterOpen((o) => !o)}
                icon={<SlidersHorizontal className="w-4 h-4" />}
                iconRight={
                  <ChevronDown
                    className={`w-3 h-3 transition-transform ${filterOpen ? "rotate-180" : ""}`}
                  />
                }
                className="rounded-sm"
              >
                {t("filter")}
              </Button>

              {filterOpen && (
                <div
                  className="absolute left-0 top-full mt-1 z-50 min-w-[240px] rounded-lg border border-border shadow-xl p-3 flex flex-col gap-3"
                  style={{ backgroundColor: "var(--surface)" }}
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted">
                      {t("selectType")}
                    </span>
                    <Select
                      size="md"
                      options={typeOptions}
                      value={filters.article_type || ""}
                      onChange={(v) => {
                        handleTypeChange(v);
                      }}
                      placeholder={t("selectType")}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted">
                      {t("selectStatus")}
                    </span>
                    <Select
                      size="md"
                      options={statusOptions}
                      value={
                        filters.active === undefined
                          ? ""
                          : filters.active
                            ? "posted"
                            : "draft"
                      }
                      onChange={(v) => {
                        handleStatusChange(v);
                      }}
                      placeholder={t("selectStatus")}
                    />
                  </div>
                </div>
              )}
            </div>

            <Button
              variant={
                filters.sort_by === "modified_at" ? "primary" : "secondary"
              }
              size="sm"
              onClick={handleDateSort}
              icon={
                filters.sort_by === "modified_at" ? (
                  filters.sort_dir === "desc" ? (
                    <ArrowDown className="w-4 h-4" />
                  ) : (
                    <ArrowUp className="w-4 h-4" />
                  )
                ) : (
                  <Calendar className="w-4 h-4" />
                )
              }
              className="rounded-sm shrink-0"
              title={
                filters.sort_by === "modified_at" && filters.sort_dir === "asc"
                  ? t("oldest")
                  : t("newest")
              }
            >
              <span className="hidden sm:inline">
                {filters.sort_by === "modified_at" && filters.sort_dir === "asc"
                  ? t("oldest")
                  : t("newest")}
              </span>
            </Button>

            <Button
              variant={filters.sort_by === "title" ? "primary" : "secondary"}
              size="sm"
              onClick={handleTitleSort}
              icon={
                filters.sort_by === "title" ? (
                  filters.sort_dir === "asc" ? (
                    <ArrowUp className="w-4 h-4" />
                  ) : (
                    <ArrowDown className="w-4 h-4" />
                  )
                ) : (
                  <ArrowUpDown className="w-4 h-4" />
                )
              }
              className="rounded-sm shrink-0"
              title={
                filters.sort_by === "title" && filters.sort_dir === "asc"
                  ? "A→Z"
                  : "Z→A"
              }
            >
              <span className="hidden sm:inline">
                {filters.sort_by === "title" && filters.sort_dir === "asc"
                  ? "A→Z"
                  : "Z→A"}
              </span>
            </Button>

            {/* Reset + count */}
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              icon={<RotateCcw className="w-4 h-4" />}
              className="shrink-0"
              title={tCommon("reset")}
            />

            <span className="shrink-0 text-xs text-muted whitespace-nowrap hidden md:inline">
              {articles.length}/{metadata.total_data}
            </span>
          </div>
        </div>

        <CategoryTabs
          activeCategory={activeCategory}
          categories={categories}
          onCategorySelect={handleCategorySelect}
          onCreateNew={() => setShowCreateModal(true)}
          onRenameCategory={handleEditCategory}
          onDeleteCategory={handleDeleteCategory}
          isAuthenticated={effectiveIsAuthenticated}
        />

        <CreateCollectionModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />

        <EditCollectionModal
          isOpen={!!editingCollection}
          collection={editingCollection}
          onClose={() => setEditingCollection(null)}
        />

        <ConfirmModal
          isOpen={!!deleteArticleTarget}
          onClose={() => setDeleteArticleTarget(null)}
          onConfirm={confirmDeleteArticle}
          title={t("deleteConfirm")}
          description={t("deleteConfirmDesc")}
          confirmLabel={tCommon("delete")}
          cancelLabel={tCommon("cancel")}
          isLoading={isDeleting}
          variant="danger"
        />

        <Modal
          isOpen={!!renameArticleTarget}
          onClose={() => setRenameArticleTarget(null)}
          title={t("renameArticle")}
          size="sm"
          footer={
            <>
              <Button
                variant="ghost"
                onClick={() => setRenameArticleTarget(null)}
                disabled={isRenaming}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                variant="primary"
                onClick={confirmRenameArticle}
                icon={<Save size={16} />}
                disabled={!renameTitle.trim() || isRenaming}
              >
                {isRenaming ? tCommon("loading") : tCommon("save")}
              </Button>
            </>
          }
        >
          <Input
            type="text"
            placeholder={t("renameArticlePlaceholder")}
            value={renameTitle}
            onChange={(e) => setRenameTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && renameTitle.trim() && !isRenaming) {
                void confirmRenameArticle();
              }
            }}
            fullWidth
            autoFocus
          />
        </Modal>

        <ConfirmModal
          isOpen={!!deleteCategoryTarget}
          onClose={() => setDeleteCategoryTarget(null)}
          onConfirm={confirmDeleteCategory}
          title={t("deleteCategoryConfirm")}
          description={t("deleteCategoryConfirmDesc")}
          confirmLabel={tCommon("delete")}
          cancelLabel={tCommon("cancel")}
          isLoading={isDeleting}
          variant="danger"
        />

        <div className="mt-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            {t("allItem")}
          </h2>
        </div>

        <div className="mt-6 relative">
          {isFolderSwitching && (
            <div className="flex items-center justify-center py-20">
              <Spinner size="lg" />
            </div>
          )}

          {!isFolderSwitching && articles.length === 0 && loading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : !isFolderSwitching && articles.length > 0 ? (
            <>
              <div className="space-y-3">
                {articles.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onRename={handleRename}
                    onPost={handlePost}
                    isAuthenticated={effectiveIsAuthenticated}
                  />
                ))}
              </div>
            </>
          ) : !isFolderSwitching ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 mb-4 flex items-center justify-center rounded-full bg-surface">
                <FileText className="w-8 h-8 text-muted" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {t("noCollectionFound")}
              </h3>
              <p className="text-muted mb-6">{t("noArticlesDescription")}</p>
              {effectiveIsAuthenticated && (
                <Button onClick={handleCreateNew}>{t("createNew")}</Button>
              )}
            </div>
          ) : null}
        </div>

        {!isFolderSwitching && metadata.total_page > 1 && (
          <div className="flex justify-center mt-8">
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handlePageChange(filters.page - 1)}
                disabled={filters.page === 1}
              >
                {tCommon("previous")}
              </Button>

              {Array.from({ length: metadata.total_page }, (_, i) => i + 1).map(
                (page) => (
                  <Button
                    key={page}
                    variant={filters.page === page ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </Button>
                ),
              )}

              <Button
                variant="secondary"
                size="sm"
                onClick={() => handlePageChange(filters.page + 1)}
                disabled={filters.page === metadata.total_page}
              >
                {tCommon("next")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
