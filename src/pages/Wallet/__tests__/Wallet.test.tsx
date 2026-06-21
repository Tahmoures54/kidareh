import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

import WalletPage from "../index";
import type { WalletStats, Transaction } from "../types";

// ---- mocks ----
vi.mock("@/hooks/useWallet", () => ({
  useWallet: vi.fn(),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/useAnalytics", () => ({
  useAnalytics: () => ({
    trackEvent: vi.fn(),
  }),
}));

vi.mock("@/hooks/useClipboard", () => ({
  useClipboard: () => ({
    copy: vi.fn(),
    copied: false,
  }),
}));

// در صورت نیاز برای جلوگیری از خطا در motion
vi.mock("motion/react", async () => {
  const actual = await vi.importActual<any>("motion/react");
  return {
    ...actual,
    motion: new Proxy(
      {},
      {
        get:
          () =>
          ({ children, ...props }: any) =>
            <div {...props}>{children}</div>,
      }
    ),
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/context/AuthContext";

const mockedUseWallet = vi.mocked(useWallet);
const mockedUseAuth = vi.mocked(useAuth);

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <WalletPage />
      </MemoryRouter>
    </HelmetProvider>
  );
}

const baseStats: WalletStats = {
  balance: 50000,
  totalEarned: 120000,
  totalWithdrawn: 70000,
  referredUsers: 3,
  referralCode: "ABC123",
  pendingCommissions: 10000,
  lastUpdated: new Date().toISOString(),
};

const baseTransactions: Transaction[] = [
  {
    id: "t1",
    type: "commission",
    amount: 15000,
    title: "پورسانت معرفی",
    date: "1405/03/29 12:30",
    timestamp: Date.now(),
    status: "success",
  },
];

describe("Wallet Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedUseAuth.mockReturnValue({
      user: {
        id: "u1",
        role: "seller",
        storeId: "s1",
      },
    } as any);

    mockedUseWallet.mockReturnValue({
      stats: baseStats,
      transactions: baseTransactions,
      loading: false,
      error: null,
      submitWithdrawal: vi.fn(),
      refreshData: vi.fn(),
    });
  });

  it("renders wallet title and balance", async () => {
    renderPage();

    expect(screen.getByText("کیف پول من")).toBeInTheDocument();

    // چون فرمت fa-IR ممکن است با جداکننده متفاوت باشد، از regex انعطاف‌پذیر استفاده می‌کنیم
    await waitFor(() => {
      expect(screen.getByText(/50[,\u066C]000|۵۰[,\u066C]۰۰۰/)).toBeInTheDocument();
    });
  });

  it("shows loading skeleton when loading and stats is null", () => {
    mockedUseWallet.mockReturnValue({
      stats: null,
      transactions: [],
      loading: true,
      error: null,
      submitWithdrawal: vi.fn(),
      refreshData: vi.fn(),
    });

    renderPage();

    // spinner wrapper
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows retry state when error and no stats", () => {
    const refreshData = vi.fn();

    mockedUseWallet.mockReturnValue({
      stats: null,
      transactions: [],
      loading: false,
      error: "خطای سرور",
      submitWithdrawal: vi.fn(),
      refreshData,
    });

    renderPage();

    expect(screen.getByText("خطای سرور")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "تلاش مجدد" })).toBeInTheDocument();
  });

  it("shows login prompt when user is not authenticated", () => {
    mockedUseAuth.mockReturnValue({ user: null } as any);

    renderPage();

    expect(screen.getByText("برای مشاهده کیف پول ابتدا وارد حساب شوید.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ورود به حساب" })).toBeInTheDocument();
  });

  it("passes low-balance state to page (insufficient funds hint should appear)", async () => {
    mockedUseWallet.mockReturnValue({
      stats: { ...baseStats, balance: 1000 },
      transactions: [],
      loading: false,
      error: null,
      submitWithdrawal: vi.fn(),
      refreshData: vi.fn(),
    });

    renderPage();

    // پیام راهنمای حداقل برداشت که در WithdrawalForm نمایش داده می‌شود
    expect(await screen.findByText(/برای برداشت، موجودی باید حداقل/i)).toBeInTheDocument();
  });
});