import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import WithdrawalForm from "../WithdrawalForm";

// اگر motion/react در تست مشکل داد:
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

function renderForm(props?: Partial<React.ComponentProps<typeof WithdrawalForm>>) {
  const defaultProps: React.ComponentProps<typeof WithdrawalForm> = {
    balance: 50000,
    canWithdraw: true,
    isWithdrawing: false,
    minAmount: 30000,
    onSubmit: vi.fn(async () => {}),
  };

  return render(
    <MemoryRouter>
      <WithdrawalForm {...defaultProps} {...props} />
    </MemoryRouter>
  );
}

describe("WithdrawalForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly", () => {
    renderForm();

    expect(screen.getByText("تسویه حساب بانکی")).toBeInTheDocument();
    expect(screen.getByLabelText("شماره شبا مقصد (بدون IR)")).toBeInTheDocument();
    expect(screen.getByLabelText("نام صاحب حساب (طبق کارت بانکی)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ثبت درخواست واریز/i })).toBeInTheDocument();
  });

  it("submit button is disabled when form is invalid", () => {
    renderForm();

    const submitBtn = screen.getByRole("button", { name: /ثبت درخواست واریز/i });
    expect(submitBtn).toBeDisabled();
  });

  it("shows iban validation error for invalid iban", async () => {
    renderForm();

    const ibanInput = screen.getByLabelText("شماره شبا مقصد (بدون IR)");
    fireEvent.change(ibanInput, { target: { value: "1234" } });
    fireEvent.blur(ibanInput);

    expect(await screen.findByText(/شماره شبا باید 24 رقم باشد|شماره شبا نامعتبر است/)).toBeInTheDocument();
  });

  it("shows account holder validation error for short name", async () => {
    renderForm();

    const holderInput = screen.getByLabelText("نام صاحب حساب (طبق کارت بانکی)");
    fireEvent.change(holderInput, { target: { value: "عل" } });
    fireEvent.blur(holderInput);

    expect(await screen.findByText("نام صاحب حساب باید حداقل 3 حرف باشد")).toBeInTheDocument();
  });

  it("enables submit when form is valid", async () => {
    renderForm();

    const ibanInput = screen.getByLabelText("شماره شبا مقصد (بدون IR)");
    const holderInput = screen.getByLabelText("نام صاحب حساب (طبق کارت بانکی)");
    const submitBtn = screen.getByRole("button", { name: /ثبت درخواست واریز/i });

    fireEvent.change(ibanInput, { target: { value: "123456789012345678901234" } });
    fireEvent.change(holderInput, { target: { value: "علی محمدی" } });

    await waitFor(() => {
      expect(submitBtn).toBeEnabled();
    });
  });

  it("calls onSubmit with normalized data when form is valid", async () => {
    const onSubmit = vi.fn(async () => {});
    renderForm({ onSubmit });

    const ibanInput = screen.getByLabelText("شماره شبا مقصد (بدون IR)");
    const holderInput = screen.getByLabelText("نام صاحب حساب (طبق کارت بانکی)");
    const submitBtn = screen.getByRole("button", { name: /ثبت درخواست واریز/i });

    fireEvent.change(ibanInput, { target: { value: "1234 5678 9012 3456 7890 1234" } });
    fireEvent.change(holderInput, { target: { value: "علی محمدی" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith({
        amount: 50000,
        iban: "123456789012345678901234",
        accountHolder: "علی محمدی",
      });
    });
  });

  it("shows minimum amount notice when balance is below minAmount", () => {
    renderForm({
      balance: 10000,
      canWithdraw: false,
      minAmount: 30000,
    });

    expect(screen.getByText(/برای برداشت، موجودی باید حداقل/i)).toBeInTheDocument();
  });

  it("shows loading state while withdrawing", () => {
    renderForm({
      isWithdrawing: true,
    });

    expect(screen.getByText("در حال ارسال...")).toBeInTheDocument();
  });
});