import { fireEvent, render, screen } from "@testing-library/react";
import BottomSheet from "../../../src/components/ui/BottomSheet";

describe("BottomSheet", () => {
  it("renders accessible dialog content when open", () => {
    render(
      <BottomSheet open onClose={() => undefined} title="فیلترها">
        <p>محتوای پنجره</p>
      </BottomSheet>,
    );

    expect(screen.getByRole("dialog", { name: "فیلترها" })).toBeInTheDocument();
    expect(screen.getByText("محتوای پنجره")).toBeInTheDocument();
  });

  it("calls onClose from the close button", () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} title="فیلترها">
        <p>محتوا</p>
      </BottomSheet>,
    );

    fireEvent.click(screen.getByRole("button", { name: "بستن پنجره" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not render content while closed", () => {
    render(
      <BottomSheet open={false} onClose={() => undefined} title="فیلترها">
        <p>محتوا</p>
      </BottomSheet>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
