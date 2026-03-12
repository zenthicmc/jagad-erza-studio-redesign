"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Input, Select, Textarea, Button, TagInput } from "@/components/ui";

interface ListicleFormValues {
  topic: string;
  writingStyle: string;
  languageStyle: string;
  language: string;
  wordCount: string;
  keywords: string[];
  advancedPrompt: string;
}

interface ListicleFormProps {
  articleType: string;
  onSubmit: (
    payload: Record<string, unknown>,
    setError: (name: string, error: { type?: string; message: string }) => void,
  ) => void;
  isSubmitting?: boolean;
}

export default function ListicleForm({
  articleType,
  onSubmit,
  isSubmitting = false,
}: ListicleFormProps) {
  const t = useTranslations("article");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm<ListicleFormValues>({
    defaultValues: {
      topic: "",
      writingStyle: "",
      languageStyle: "",
      language: "",
      wordCount: "",
      keywords: [],
      advancedPrompt: "",
    },
  });

  const writingStyleOptions = [
    { value: "formal", label: t("form.options.writingStyle.formal") },
    { value: "informal", label: t("form.options.writingStyle.informal") },
    { value: "casual", label: t("form.options.writingStyle.casual") },
    { value: "descriptive", label: t("form.options.writingStyle.descriptive") },
    { value: "persuasive", label: t("form.options.writingStyle.persuasive") },
    { value: "expository", label: t("form.options.writingStyle.expository") },
    { value: "narrative", label: t("form.options.writingStyle.narrative") },
  ];

  const languageStyleOptions = [
    { value: "metaphor", label: t("form.options.languageStyle.metaphor") },
    { value: "hyperbole", label: t("form.options.languageStyle.hyperbole") },
    { value: "repetition", label: t("form.options.languageStyle.repetition") },
    { value: "climax", label: t("form.options.languageStyle.climax") },
    { value: "anticlimax", label: t("form.options.languageStyle.anticlimax") },
    { value: "euphemism", label: t("form.options.languageStyle.euphemism") },
    {
      value: "personification",
      label: t("form.options.languageStyle.personification"),
    },
  ];

  const languageOptions = [
    { value: "id", label: t("langId") },
    { value: "en", label: t("langEn") },
  ];

  const minWordMap: Record<string, number> = {
    listicle: 1000,
    longform: 2000,
    news: 1000,
  };

  const minWordCount = minWordMap[articleType] || 2000;

  const handleFormSubmit = (data: ListicleFormValues) => {
    let hasError = false;
    if (!data.writingStyle) {
      setError("writingStyle", { message: t("form.errorRequired") });
      hasError = true;
    }
    if (!data.languageStyle) {
      setError("languageStyle", { message: t("form.errorRequired") });
      hasError = true;
    }
    if (!data.language) {
      setError("language", { message: t("form.errorRequired") });
      hasError = true;
    }
    if (hasError) return;

    const wordCountNum = parseInt(data.wordCount);
    if (isNaN(wordCountNum) || wordCountNum < minWordCount) {
      setError("wordCount", {
        message: t("form.errorWordMin", {
          count: minWordCount.toString(),
        }),
      });
      return;
    }

    const payload: Record<string, unknown> = {
      topics: [data.topic],
      writing_style: data.writingStyle,
      language_style: data.languageStyle,
      language: data.language === "id" ? "indonesia" : "english",
      word_count: wordCountNum,
      article_type: articleType,
    };

    if (data.keywords && data.keywords.length > 0) {
      payload.keyword = data.keywords.join(",");
    }

    if (data.advancedPrompt) {
      payload.custom_prompt = data.advancedPrompt;
    }

    onSubmit(
      payload,
      setError as (
        name: string,
        error: { type?: string; message: string },
      ) => void,
    );
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 mt-4">
      <Input
        label={t("form.topic")}
        placeholder={t("form.topicPlaceholder")}
        error={errors.topic?.message}
        {...register("topic", {
          required: t("form.errorRequired"),
        })}
      />

      <Select
        label={t("form.writingStyle")}
        placeholder={t("form.writingStylePlaceholder")}
        options={writingStyleOptions}
        value={watch("writingStyle")}
        onChange={(val) => {
          setValue("writingStyle", val);
          clearErrors("writingStyle");
        }}
        error={errors.writingStyle?.message}
      />

      <Select
        label={t("form.languageStyle")}
        placeholder={t("form.languageStylePlaceholder")}
        options={languageStyleOptions}
        value={watch("languageStyle")}
        onChange={(val) => {
          setValue("languageStyle", val);
          clearErrors("languageStyle");
        }}
        error={errors.languageStyle?.message}
      />

      <div className="grid grid-cols-2 gap-3">
        <Select
          label={t("form.languageSelect")}
          placeholder={t("form.languagePlaceholder")}
          options={languageOptions}
          value={watch("language")}
          onChange={(val) => {
            setValue("language", val);
            clearErrors("language");
          }}
          error={errors.language?.message}
        />

        <Input
          label={t("form.wordCount")}
          type="number"
          placeholder={t("form.wordCountPlaceholder")}
          error={errors.wordCount?.message}
          {...register("wordCount", {
            required: t("form.errorRequired"),
            min: {
              value: minWordCount,
              message: t("form.errorWordMin", {
                count: minWordCount.toString(),
              }),
            },
          })}
        />
      </div>

      <TagInput
        label={t("form.keywords")}
        placeholder={t("form.keywordsPlaceholder")}
        value={watch("keywords")}
        onChange={(tags) => setValue("keywords", tags)}
      />

      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-light transition-colors"
        >
          {showAdvanced ? (
            <>
              {t("hidePrompt")}
              <ChevronUp size={14} />
            </>
          ) : (
            <>
              {t("form.advancedPrompt")}
              <ChevronDown size={14} />
            </>
          )}
        </button>

        {showAdvanced && (
          <div className="mt-2">
            <Textarea
              placeholder={t("form.advancedPromptPlaceholder")}
              rows={3}
              {...register("advancedPrompt")}
            />
          </div>
        )}
      </div>

      <p className="text-xs text-muted text-left">
        {t("form.creditPerUse", { count: "1" })}
      </p>
      <Button
        type="submit"
        fullWidth
        icon={<Sparkles size={16} />}
        disabled={isSubmitting}
      >
        {isSubmitting ? t("generating") : t("form.generate")}
      </Button>
    </form>
  );
}
