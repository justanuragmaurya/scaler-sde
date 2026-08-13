import { create } from "zustand";

type Modal = "new-chat" | "new-group" | "settings" | "search" | "coming-soon" | null;

type UiState = {
  theme: "dark" | "light" | "system";
  modal: Modal;
  comingSoon: string;
  infoOpen: boolean;
  mobileShowChat: boolean;
  setTheme: (theme: UiState["theme"]) => void;
  openModal: (modal: Modal, label?: string) => void;
  closeModal: () => void;
  setInfoOpen: (open: boolean) => void;
  setMobileShowChat: (open: boolean) => void;
};

function applyTheme(theme: UiState["theme"]) {
  if (typeof document === "undefined") return;
  const dark =
    theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export const useUi = create<UiState>((set) => ({
  theme: "dark",
  modal: null,
  comingSoon: "",
  infoOpen: false,
  mobileShowChat: false,
  setTheme: (theme) => {
    localStorage.setItem("signal-theme", theme);
    applyTheme(theme);
    set({ theme });
  },
  openModal: (modal, label) => set({ modal, comingSoon: label ?? "" }),
  closeModal: () => set({ modal: null }),
  setInfoOpen: (infoOpen) => set({ infoOpen }),
  setMobileShowChat: (mobileShowChat) => set({ mobileShowChat }),
}));

export function initTheme() {
  const stored = (localStorage.getItem("signal-theme") as UiState["theme"] | null) ?? "dark";
  useUi.setState({ theme: stored });
  applyTheme(stored);
}
