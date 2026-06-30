import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import WalletPage from "../index";

/* ─── Mocks ─── */
vi.mock("../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../hooks/useWallet", () => ({
  useWallet: vi.fn(),
}));

vi.mock("../../hooks/useClipboard", () => ({
  useClipboard: () => ({ copy: vi.fn(), copied: false }),
}));

vi.mock("../../components/ui/ErrorBoundary", () => ({
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock("motion/react", async () => {
  const actual = await vi.importActual<any>("motion/react");
  return {
    ...actual,
    motion: new Proxy({}, {
      get: () => ({ children, ...props }: any) => <div {...props}>{children}</div>,
    }),
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

/* ─── Helpers ─── */
import { useAuth }   from "../../context/AuthContext";
import { useWallet } from "../../hooks/useWallet";

const mockUseAuth   = vi.mocked(useAuth);
const mockUseWallet = vi.mocked(useWallet);

const BASE_STATS = {
  balance:            50_000,
  totalEarned:       120_000,
  totalWithdrawn:     70_000,
  referredUsers:           3,
  referralCode:      "KD-ABC",
  pendingCommissions: 10_000,
  lastUpdated:        new Date().toISOString(),
};

const BASE_TRANSACTIONS = [
  {
    id: "t1",
    type: "commission" as const,
    status: "success" as const,
    title: "پورسانت معرفی",
    amount: 15_000,
    created_at: new Date().toISOString(),
  },
];

function setup(overrides?: { stats?: any; transactions?: any; loading?: boolean; error?: string | null }) {
  mockUseAuth.mockReturnValue({
    user: { id: "u1", role: "seller" },
  } as any);

  mockUseWallet.mockReturnValue({
    stats:            overrides?.stats       ?? BASE_STATS,
    transactions:     overrides?.transactions ?? BASE_TRANSACTIONS,
    loading:          overrides?.loading      ?? false,
    error:            overrides?.error        ?? null,
    submitWithdrawal: vi.fn(),
    refreshData:      vi.fn(),
  } as any);

  return render(
    <MemoryRouter>
      <WalletPage />
    </MemoryRouter>
  );
}

/* ─── Tests ─── */
describe("WalletPage", () => {
  beforeEach(() => vi.clearAllMocks());

  /* ── نمایش پایه ── */
  it("هدر و کیف پول را نمایش می‌دهد", () => {
    setup();
    expect(screen.getByText("کیف پول")).toBeInTheDocument();
  });

  it("موجودی را به فارسی نمایش می‌دهد", async () => {
    setup();
    await waitFor(() => {
      // ۵۰٬۰۰۰ یا شکل‌های مشابه
      expect(
        screen.getByText(/۵۰[٬,]?۰۰۰/)
      ).toBeInTheDocument();
    });
  });

  /* ── loading ── */
  it("اسپینر بارگذاری را نمایش می‌دهد", () => {
    setup({ stats: null, loading: true });
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  /* ── error ── */
  it("پیام خطا و دکمه تلاش مجدد را نمایش می‌دهد", () => {
    setup({ stats: null, error: "خطای سرور" });
    expect(screen.getByText("خطای سرور")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /تلاش مجدد/i })).toBeInTheDocument();
  });

  /* ── موجودی پایین ── */
  it("پیام موجودی ناکافی را نمایش می‌دهد", async () => {
    setup({ stats: { ...BASE_STATS, balance: 1_000 } });
    await waitFor(() => {
      expect(
        screen.getByText(/موجودی ناکافی|حداقل برداشت/i)
      ).toBeInTheDocument();
    });
  });

  /* ── تراکنش‌ها ── */
  it("تراکنش‌ها را نمایش می‌دهد", async () => {
    setup();
    await waitFor(() => {
      expect(screen.getByText("پورسانت معرفی")).toBeInTheDocument();
    });
  });

  it("وقتی تراکنش نیست پیام خالی نمایش می‌دهد", async () => {
    setup({ transactions: [] });
    await waitFor(() => {
      expect(
        screen.getByText(/هنوز تراکنشی ثبت نشده/i)
      ).toBeInTheDocument();
    });
  });

  /* ── refresh ── */
  it("دکمه refresh صدا می‌زند", async () => {
    const refreshData = vi.fn();
    mockUseWallet.mockReturnValue({
      stats: BASE_STATS,
      transactions: [],
      loading: false,
      error: null,
      submitWithdrawal: vi.fn(),
      refreshData,
    } as any);

    render(<MemoryRouter><WalletPage /></MemoryRouter>);
    fireEvent.click(screen.getAllByRole("button")[2]); // دکمه refresh در هدر
    await waitFor(() => {
      expect(refreshData).toHaveBeenCalled();
    });
  });

  /* ── کد معرفی — فقط برای بازاریاب ── */
  it("کد معرفی را فقط برای بازاریاب نمایش می‌دهد", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u2", role: "marketer" },
    } as any);
    mockUseWallet.mockReturnValue({
      stats: BASE_STATS,
      transactions: [],
      loading: false,
      error: null,
      submitWithdrawal: vi.fn(),
      refreshData: vi.fn(),
    } as any);

    render(<MemoryRouter><WalletPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText("کد معرفی شما")).toBeInTheDocument();
      expect(screen.getByText("KD-ABC")).toBeInTheDocument();
    });
  });

  it("کد معرفی را برای فروشنده نمایش نمی‌دهد", async () => {
    setup(); // role = seller
    await waitFor(() => {
      expect(
        screen.queryByText("کد معرفی شما")
      ).not.toBeInTheDocument();
    });
  });
});