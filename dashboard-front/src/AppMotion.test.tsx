import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("framer-motion", () => ({
  MotionConfig: ({ reducedMotion, children }: { reducedMotion: string; children: ReactNode }) => (
    <div data-testid="motion-config" data-reduced-motion={reducedMotion}>{children}</div>
  ),
}));

vi.mock("react-router-dom", () => ({
  BrowserRouter: ({ children }: { children: ReactNode }) => <>{children}</>,
  Routes: ({ children }: { children: ReactNode }) => <>{children}</>,
  Route: () => null,
  Navigate: () => null,
}));

vi.mock("./contexts/AuthContext", () => ({ AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("./contexts/ToastContext", () => ({ ToastProvider: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("./components/ui/ToastContainer", () => ({ ToastContainer: () => null }));
vi.mock("./routes/PrivateRoute", () => ({ PrivateRoute: () => null }));
vi.mock("./components/layout/AppLayout", () => ({ AppLayout: () => null }));
vi.mock("./pages/Login", () => ({ Login: () => null }));
vi.mock("./pages/Register", () => ({ Register: () => null }));
vi.mock("./pages/Dashboard", () => ({ Dashboard: () => null }));
vi.mock("./pages/MinhasLojas", () => ({ MinhasLojas: () => null }));

import App from "./App";

describe("App motion preferences", () => {
  it("delega ao navegador a redução das animações", () => {
    render(<App />);
    expect(screen.getByTestId("motion-config")).toHaveAttribute("data-reduced-motion", "user");
  });
});
