type ShareGameResultParams = {
  title: string;
  text: string;
  url?: string;
};

const canUseNavigatorShare = () => {
  return (
    typeof navigator !== "undefined" && typeof navigator.share === "function"
  );
};

const canUseClipboard = () => {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  );
};

export const shareGameResult = async ({
  title,
  text,
  url,
}: ShareGameResultParams) => {
  if (canUseNavigatorShare()) {
    await navigator.share({ title, text, url });
    return "shared" as const;
  }

  if (canUseClipboard()) {
    await navigator.clipboard.writeText(url ? `${text}\n${url}` : text);
    return "copied" as const;
  }

  throw new Error("sharing-unavailable");
};
