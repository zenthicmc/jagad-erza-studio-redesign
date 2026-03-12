import {
  Folder,
  Star,
  Heart,
  Bookmark,
  Tag,
  Zap,
  Award,
  Flag,
  FileText,
  Music,
  Camera,
  Coffee,
} from "lucide-react";

export const COLLECTION_ICON_OPTIONS = [
  { name: "folder", icon: Folder },
  { name: "star", icon: Star },
  { name: "heart", icon: Heart },
  { name: "bookmark", icon: Bookmark },
  { name: "tag", icon: Tag },
  { name: "zap", icon: Zap },
  { name: "award", icon: Award },
  { name: "flag", icon: Flag },
  { name: "file-text", icon: FileText },
  { name: "music", icon: Music },
  { name: "camera", icon: Camera },
  { name: "coffee", icon: Coffee },
] as const;

export type CollectionIconName =
  (typeof COLLECTION_ICON_OPTIONS)[number]["name"];

export const COLLECTION_COLOR_OPTIONS = [
  "#FF9AA2",
  "#FFB7A5",
  "#FFF4A3",
  "#B5EAD7",
  "#A0E7E5",
  "#C7CEEA",
  "#D5B6FF",
] as const;

