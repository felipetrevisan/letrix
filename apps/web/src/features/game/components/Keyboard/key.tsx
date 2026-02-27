import { cva } from "class-variance-authority";
import { motion } from "motion/react";
import { CSSProperties, ReactNode } from "react";
import { MotionHighlight } from "@/components/animate-ui/primitives/motion-highlight";
import { Button } from "@/components/ui/button";
import { REVEAL_TIME_MS } from "@/config/settings";
import { useApp } from "@/contexts/AppContext";
import { Status } from "@/lib/statuses";
import { cn } from "@/lib/utils";

const MotionButton = motion(Button);

type Props = {
  asChild?: boolean;
  children?: ReactNode;
  value: string;
  size?: "large" | "default";
  status?: Status;
  statusSegments?: Array<Status | undefined>;
  isRevealing?: boolean;
  disabled: boolean;
  solutionLength?: number;
  motionIndex?: number;
  className?: string;
  hovered?: boolean;
  onHoverStart?: (value: string) => void;
  onHoverEnd?: () => void;
  onClick: (value: string) => void;
};

export function Key({
  value,
  children,
  size = "default",
  status,
  statusSegments,
  isRevealing = false,
  disabled,
  solutionLength = 0,
  motionIndex = 0,
  onClick,
  className,
  hovered = false,
  onHoverStart,
  onHoverEnd,
}: Props) {
  const { storage } = useApp();
  const keyDelayMs = REVEAL_TIME_MS * solutionLength;
  const hasSegmentedStatus = (statusSegments?.length ?? 0) > 1;

  const getSegmentColor = (segmentStatus: Status | undefined) => {
    switch (segmentStatus) {
      case "correct":
        return storage?.highContrast
          ? "hsl(var(--tile-correct-contrast))"
          : "hsl(var(--tile-correct))";
      case "present":
        return storage?.highContrast
          ? "hsl(var(--tile-present-contrast))"
          : "hsl(var(--tile-present))";
      case "absent":
        return storage?.highContrast
          ? "hsl(var(--tile-absent-contrast))"
          : "hsl(var(--tile-absent))";
      default:
        return "hsl(var(--muted) / 0.65)";
    }
  };

  const segmentedBackground = hasSegmentedStatus
    ? `linear-gradient(90deg, ${statusSegments
        ?.map((segmentStatus, index) => {
          const start = (index * 100) / (statusSegments.length || 1);
          const end = ((index + 1) * 100) / (statusSegments.length || 1);
          const color = getSegmentColor(segmentStatus);
          return `${color} ${start}% ${end}%`;
        })
        .join(", ")})`
    : undefined;

  const keyStyle = {
    transitionDelay: isRevealing ? `${keyDelayMs}ms` : "unset",
    "--key-bg-image": segmentedBackground ?? "none",
  } as CSSProperties;

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (event) => {
    onClick(value);
    event.currentTarget.blur();
  };

  const classes = cva("key", {
    variants: {
      size: {
        large: "col-span-3",
        default: "col-span-2",
      },
      revealing: {
        true: "transition ease-in-out",
      },
      status: {
        default: "",
        absent: "key-absent",
        correct: "key-correct",
        present: "key-present",
      },
      disabled: {
        true: "pointer-events-none",
      },
      inverted: {
        true: "inverted",
      },
    },
    defaultVariants: {
      size: "default",
      revealing: false,
      status: "default",
      disabled: false,
      inverted: false,
    },
  });

  return (
    <MotionButton
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={!disabled ? { y: -1 } : undefined}
      whileTap={{ scale: !disabled ? 0.97 : 1 }}
      transition={{ duration: 0.18, delay: Math.min(motionIndex * 0.012, 0.2) }}
      style={keyStyle}
      className={cn(
        classes({
          size,
          revealing: isRevealing,
          status,
          disabled,
          inverted: storage?.highContrast,
        }),
        hasSegmentedStatus && "key-segmented",
        "hover:bg-transparent hover:text-current",
        className,
      )}
      onClick={handleClick}
      onMouseEnter={() => onHoverStart?.(value)}
      onMouseLeave={onHoverEnd}
      aria-label={`${value}${status ? " " + status : ""}`}
      disabled={disabled}
      variant="outline"
      size="xl"
    >
      <MotionHighlight
        active={!disabled && hovered}
        layoutId="keyboard-motion-highlight"
        className="z-10 rounded-[inherit] border-2 border-primary/80 shadow-[0_0_0_1px_hsl(var(--primary)/0.45),0_0_14px_hsl(var(--primary)/0.55),inset_0_0_12px_hsl(var(--primary)/0.2)]"
      />
      <span className="relative z-20 inline-flex items-center justify-center">
        {children || value}
      </span>
    </MotionButton>
  );
}
