import { create } from "zustand";

interface ModalState {
  modals: Record<string, boolean>;
  openModal: (id: string) => void;
  closeModal: (id: string) => void;
  toggleModal: (id: string) => void;
  isOpen: (id: string) => boolean;
}

export const useModalStore = create<ModalState>((set, get) => ({
  modals: {},
  openModal: (id) => set((s) => ({ modals: { ...s.modals, [id]: true } })),
  closeModal: (id) => set((s) => ({ modals: { ...s.modals, [id]: false } })),
  toggleModal: (id) =>
    set((s) => ({ modals: { ...s.modals, [id]: !s.modals[id] } })),
  isOpen: (id) => !!get().modals[id],
}));
