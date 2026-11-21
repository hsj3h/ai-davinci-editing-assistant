export type ControlMode = "api" | "gui";

export const controlModeConfig = {
  api: {
    name: "API Mode",
    description: "Direct DaVinci Resolve scripting without automatic cursor movement.",
    executionEngine: "resolve_api",
    cursorAutomation: false,
    requiresDesktopAutomation: false,
  },
  gui: {
    name: "GUI Mode",
    description: "Automated GUI interaction with visible, colourful agent cursors.",
    executionEngine: "desktop_automation",
    cursorAutomation: true,
    requiresDesktopAutomation: true,
  },
} as const;
