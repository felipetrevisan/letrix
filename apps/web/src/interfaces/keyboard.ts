import { Status } from "@/lib/statuses";

export type KeyButtonProps = {
  asChild?: boolean;
  children?: React.ReactNode;
  value: string;
  large?: boolean;
  status?: Status;
  isRevealing?: boolean;
  disabled: boolean;
  solution?: string;
  onClick: (value: string) => void;
};
