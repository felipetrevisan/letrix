import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
            "group toast w-[min(92vw,28rem)] will-change-transform rounded-2xl border border-border/70 bg-background/92 px-4 py-3.5 text-foreground shadow-[0_20px_48px_-26px_hsl(var(--foreground)/0.72)] backdrop-blur-xl transition-all group-[.toaster]:text-foreground sm:w-[min(32rem,calc(100vw-2rem))]",
          title:
            "text-[0.95rem] font-semibold tracking-[0.02em] text-foreground sm:text-base",
          description:
            "whitespace-pre-line text-sm leading-6 text-muted-foreground/95 sm:text-[0.95rem]",
          icon: "mt-0.5 text-foreground",
          actionButton: cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "rounded-xl border-primary/55 bg-primary/10 px-3.5 text-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.18),0_0_20px_hsl(var(--primary)/0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:bg-primary/14 hover:text-primary hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.32),0_0_28px_hsl(var(--primary)/0.28)] focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-0",
          ),
          cancelButton:
            "rounded-md border border-border/60 bg-muted/75 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors duration-200 hover:border-border hover:bg-muted",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
