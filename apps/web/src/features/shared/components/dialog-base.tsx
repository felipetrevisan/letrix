"use client";

import { ReactNode } from "react";
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
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={cn("overflow-hidden", className)}>
        <DialogHeader className="border-b border-border/60 pb-3">
          {showHeader && <DialogTitle>{title}</DialogTitle>}
        </DialogHeader>
        {contentScrollable ? (
          <ScrollArea className="max-h-[min(74vh,44rem)] pr-3">
            <div className="text-md text-card-foreground">{children}</div>
          </ScrollArea>
        ) : (
          <div className="text-md text-card-foreground">{children}</div>
        )}
        {buttons && buttons.length > 0 && (
          <DialogFooter className="border-t border-border/60 pt-3">
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
