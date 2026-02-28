import { Sparkles, TriangleAlert } from "lucide-react";
import { createElement } from "react";
import type { ExternalToast } from "sonner";

type ToastLifecycleHandlers = Pick<ExternalToast, "onAutoClose" | "onDismiss">;
type ToastAction = ExternalToast["action"];

const topCenterToast = {
  position: "top-center" as const,
  dismissible: true,
};

export const createIncompleteWordToast = (
  handlers: ToastLifecycleHandlers,
): ExternalToast => ({
  ...topCenterToast,
  ...handlers,
  description: "Complete todas as casas da linha atual.",
  icon: createElement(TriangleAlert, { className: "size-4" }),
  className: "toast-word-miss",
  duration: 1000,
});

export const createWordNotFoundToast = (
  handlers: ToastLifecycleHandlers,
): ExternalToast => ({
  ...topCenterToast,
  ...handlers,
  description: "Tente outra combinação.",
  icon: createElement(TriangleAlert, { className: "size-4" }),
  className: "toast-word-miss",
  duration: 1100,
});

export const createConstraintToast = (
  handlers: ToastLifecycleHandlers,
): ExternalToast => ({
  ...topCenterToast,
  ...handlers,
  className: "toast-word-miss",
  duration: 1000,
});

export const createInfiniteWinToast = (
  handlers: ToastLifecycleHandlers,
): ExternalToast => ({
  ...topCenterToast,
  ...handlers,
  description: "Continue a sequência no modo infinito.",
  icon: createElement(Sparkles, { className: "size-4" }),
  className: "toast-win",
  duration: 1000,
});

export const createWinToast = ({
  action,
  ...handlers
}: ToastLifecycleHandlers & { action?: ToastAction }): ExternalToast => ({
  ...topCenterToast,
  ...handlers,
  description: "Palavra correta. Excelente jogada.",
  icon: createElement(Sparkles, { className: "size-4" }),
  className: "toast-win",
  action,
  duration: 1000,
});

export const createGameOverToast = ({
  action,
  ...handlers
}: ToastLifecycleHandlers & { action?: ToastAction }): ExternalToast => ({
  ...topCenterToast,
  ...handlers,
  description: "Fim das tentativas desta rodada.",
  className: "toast-game-over",
  action,
});
