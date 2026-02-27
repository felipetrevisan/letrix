"use client";

import { useGame } from "@/contexts/GameContext";
import { useApp } from "@/contexts/AppContext";
import { InfoModal } from "@/features/game/components/info-modal";
import { SettingsModal } from "@/features/settings/components/settings-modal";

export const Modals = () => {
  const {
    isInfoModalOpen,
    isSettingsModalOpen,
    setIsInfoModalOpen,
    setIsSettingsModalOpen,
  } = useApp();

  const { guesses } = useGame();

  return (
    <>
      {isInfoModalOpen && (
        <InfoModal
          isOpen={isInfoModalOpen}
          handleClose={() => setIsInfoModalOpen(false)}
        />
      )}
      {isSettingsModalOpen && (
        <SettingsModal
          isOpen={isSettingsModalOpen}
          handleClose={() => setIsSettingsModalOpen(false)}
          disableHardModeOption={!!guesses.length}
        />
      )}
    </>
  );
};
