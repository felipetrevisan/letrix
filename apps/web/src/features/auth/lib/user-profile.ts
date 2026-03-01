import type { User } from "@supabase/supabase-js";

const getMetadataString = (user: User | null, key: string) => {
  const value = user?.user_metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

const getEmailLocalPart = (user: User | null) => {
  const email = user?.email?.trim();
  if (!email) {
    return null;
  }

  const localPart = email.split("@")[0]?.trim();
  return localPart || null;
};

export const getUserDisplayName = (user: User | null) => {
  const metadataName =
    getMetadataString(user, "full_name") ??
    getMetadataString(user, "name") ??
    getMetadataString(user, "user_name") ??
    getMetadataString(user, "preferred_username");

  return metadataName ?? getEmailLocalPart(user) ?? "Usuario";
};

export const getUserAvatarUrl = (user: User | null) => {
  return (
    getMetadataString(user, "avatar_url") ?? getMetadataString(user, "picture")
  );
};

export const getUserInitials = (user: User | null) => {
  const displayName = getUserDisplayName(user)
    .replace(/[_.-]+/g, " ")
    .trim();
  const parts = displayName.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toLocaleUpperCase(
      "pt-BR",
    );
  }

  const compact = parts[0] ?? displayName;
  return compact.slice(0, 2).toLocaleUpperCase("pt-BR");
};
