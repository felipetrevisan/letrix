import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      expand
      gap={10}
      offset={16}
      visibleToasts={4}
      toastOptions={{
        classNames: {
          toast:
            "group toast will-change-transform rounded-xl border border-border/70 bg-background/90 px-4 py-3 text-foreground shadow-[0_18px_40px_-28px_hsl(var(--foreground)/0.75)] backdrop-blur-xl transition-all group-[.toaster]:text-foreground",
          title: "font-semibold tracking-wide text-foreground",
          description: "text-muted-foreground/95",
          icon: "mt-0.5 text-foreground",
          actionButton:
            "rounded-lg border border-primary/65 bg-linear-to-r from-primary via-secondary to-accent px-3.5 py-1.5 text-xs font-semibold text-white shadow-[0_0_0_1px_hsl(var(--primary)/0.22),0_10px_26px_-14px_hsl(var(--primary)/0.9),0_0_18px_hsl(var(--primary)/0.4)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.35),0_16px_34px_-16px_hsl(var(--primary)/0.95),0_0_26px_hsl(var(--secondary)/0.42)] focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-0",
          cancelButton:
            "rounded-md border border-border/60 bg-muted/75 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors duration-200 hover:border-border hover:bg-muted",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
