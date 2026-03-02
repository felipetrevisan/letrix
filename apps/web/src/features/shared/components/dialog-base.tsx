"use client";

import { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Button, buttonVariants } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/animate-ui/primitives/dialog";
import { VariantProps } from "class-variance-authority";
import { createFadeUpMotion } from "@/config/motion-variants";
import { cn } from "@/lib/utils";

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

type DialogButtons = {
  name: string;
  label: string;
  variant: Pick<ButtonVariantProps, "variant">;
  action?: () => void;
};

type Props = {
  title: string;
  children: ReactNode;
  isOpen: boolean;
  className?: string;
  contentScrollable?: boolean;
  showHeader?: boolean;
  handleClose: () => void;
  buttons?: DialogButtons[];
};

export const Base = ({
  title,
  children,
  isOpen,
  showHeader = false,
  className,
  contentScrollable = false,
  handleClose,
  buttons,
}: Props) => {
  const shouldReduceMotion = useReducedMotion() ?? false;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className={cn(
          "flex max-h-[min(92svh,92dvh)] flex-col overflow-hidden",
          contentScrollable &&
            "h-[min(92svh,92dvh)] sm:h-[min(88svh,56rem)] sm:max-h-[min(88svh,56rem)]",
          className,
        )}
      >
        <DialogHeader className="shrink-0 border-b border-border/60 pb-3">
          {showHeader && <DialogTitle>{title}</DialogTitle>}
        </DialogHeader>
        {contentScrollable ? (
          <ScrollArea className="min-h-0 flex-1 overscroll-contain pr-3">
            <motion.div
              className="pb-4 text-md text-card-foreground"
              {...createFadeUpMotion({
                distance: 10,
                reducedMotion: shouldReduceMotion,
              })}
            >
              {children}
            </motion.div>
          </ScrollArea>
        ) : (
          <motion.div
            className="min-h-0 text-md text-card-foreground"
            {...createFadeUpMotion({
              distance: 10,
              reducedMotion: shouldReduceMotion,
            })}
          >
            {children}
          </motion.div>
        )}
        {buttons && buttons.length > 0 && (
          <DialogFooter className="shrink-0 border-t border-border/60 pt-3">
            {buttons?.map(({ name, variant: { variant }, label, action }) => (
              <Button key={name} variant={variant} onClick={() => action?.()}>
                {label}
              </Button>
            ))}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
