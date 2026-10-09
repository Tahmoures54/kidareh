import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import ReferralPage from "../../../../src/pages/Referral";

vi.mock("../../../../src/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../../../src/hooks/useReferral", () => ({
  useReferral: vi.fn(),
}));

vi.mock("../../../../src/hooks/useClipboard", () => ({
  useClipboard: () => ({ copy: vi.fn(), copied: false }),
}));

vi.mock("../../../../src/utils/api", () => ({
  api: {
    get: vi.fn().mockResolvedValue({ success: true, leaderboard: [], myRank: null }),
  },
}));

import { useAuth } from "../../../../src/context/AuthContext";
import { useReferral } from "../../../../src/hooks/useReferral";

const mockUseAuth = vi.mocked(useAuth);
const mockUseReferral = vi.mocked(useReferral);

const stats = {
  balance: 50000,
  totalEarned: 120000,
  totalWithdrawn: 70000,
  referredUsers: 3,
  referralCode: "KD-ABC",
  pendingCommissions: 10000,
  lastUpdated: new Date().toISOString(),
};

function renderPage(role: "seller" | "marketer" = "marketer") {
  mockUseAuth.mockReturnValue({
    user: { id: "user-1", phone: "09120000000", role },
  } as ReturnType<typeof useAuth>);

  mockUseReferral.mockReturnValue({
    stats,
    percentage: 25,
    transactions: [],
    loading: false,
    error: null,
    submitWithdrawal: vi.fn().mockResolvedValue(undefined),
    refreshData: vi.fn().mockResolvedValue(undefined),
  } as ReturnType<typeof useReferral>);

  return render(
    <MemoryRouter>
      <ReferralPage />
    </MemoryRouter>,
  );
}

describe("ReferralPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the current earnings dashboard heading", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "کسب درآمد" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "تازه‌سازی" })).toBeInTheDocument();
  });

  it("renders the invitation code when a marketer is signed in", () => {
    renderPage("marketer");
    expect(screen.getByText("KD-ABC")).toBeInTheDocument();
  });

  it("keeps the page usable for a seller account", () => {
    renderPage("seller");
    expect(screen.getByRole("heading", { name: "کسب درآمد" })).toBeInTheDocument();
  });
});
