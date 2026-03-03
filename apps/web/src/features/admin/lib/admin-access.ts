const parseAdminEmails = (value?: string | null) => {
  return new Set(
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim().toLocaleLowerCase("en-US"))
      .filter(Boolean),
  );
};

export const isEmailAllowedAsAdmin = (
  email?: string | null,
  value?: string | null,
) => {
  if (!email) {
    return false;
  }

  const adminEmails = parseAdminEmails(value);

  if (!adminEmails.size) {
    return false;
  }

  return adminEmails.has(email.trim().toLocaleLowerCase("en-US"));
};

export const isClientAdminEmail = (email?: string | null) => {
  return isEmailAllowedAsAdmin(
    email,
    process.env.NEXT_PUBLIC_LETRIX_ADMIN_EMAILS,
  );
};

export const isServerAdminEmail = (email?: string | null) => {
  return isEmailAllowedAsAdmin(
    email,
    process.env.LETRIX_ADMIN_EMAILS ??
      process.env.NEXT_PUBLIC_LETRIX_ADMIN_EMAILS,
  );
};
