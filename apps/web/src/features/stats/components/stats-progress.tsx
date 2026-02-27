import { cn } from "@/lib/utils";

type Props = {
  index: number;
  size: number;
  label: string;
  isCurrentDayStatRow: boolean;
};

export const StatsProgress = ({
  index,
  size,
  label,
  isCurrentDayStatRow,
}: Props) => {
  const width = `${Math.max(8, size)}%`;

  return (
    <div className="flex items-center gap-2">
      <div className="w-6 text-center text-sm font-semibold text-muted-foreground">
        {index === -1 ? "X" : index + 1}
      </div>
      <div className="h-7 w-full overflow-hidden rounded-lg border border-border/60 bg-muted/45">
        <div
          className={cn(
            "flex h-full items-center justify-end px-2 text-xs font-bold text-primary-foreground transition-all duration-300",
            isCurrentDayStatRow ? "bg-primary" : "bg-[hsl(var(--tile-absent))]",
          )}
          style={{ width }}
        >
          {label}
        </div>
      </div>
    </div>
  );
};
