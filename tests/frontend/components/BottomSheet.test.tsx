import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BottomSheet from "../../../src/components/ui/BottomSheet";

describe("BottomSheet", () => {
  it("renders an accessible dialog when open", () => {
    render(<BottomSheet open onClose={vi.fn()} title="نقشه اطراف"><p>محتوای نقشه</p></BottomSheet>);
    expect(screen.getByRole("dialog", { name: "نقشه اطراف" })).toBeInTheDocument();
    expect(screen.getByText("محتوای نقشه")).toBeInTheDocument();
  });

  it("closes from the accessible close control", () => {
    const onClose = vi.fn();
    render(<BottomSheet open onClose={onClose} title="نقشه اطراف"><p>محتوا</p></BottomSheet>);
    fireEvent.click(screen.getByRole("button", { name: "بستن" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not render content when closed", () => {
    render(<BottomSheet open={false} onClose={vi.fn()} title="نقشه اطراف"><p>محتوا</p></BottomSheet>);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
