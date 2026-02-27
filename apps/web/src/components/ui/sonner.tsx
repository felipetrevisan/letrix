import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast rounded-xl border border-border/70 bg-background/90 px-4 py-3 text-foreground shadow-[0_18px_40px_-28px_hsl(var(--foreground)/0.75)] backdrop-blur-xl transition-all group-[.toaster]:text-foreground",
          title: "font-semibold tracking-wide",
          description: "text-muted-foreground/95",
          actionButton:
            "rounded-md border border-primary/60 bg-primary/90 px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:border-primary hover:bg-primary",
          cancelButton:
            "rounded-md border border-border/60 bg-muted/75 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-border hover:bg-muted",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
