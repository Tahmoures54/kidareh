import { triggerHaptic } from "../../src/utils/haptics";

describe("triggerHaptic", () => {
  it("uses the selected vibration pattern when supported", () => {
    const vibrate = vi.fn(() => true);
    Object.defineProperty(navigator, "vibrate", { configurable: true, value: vibrate });

    triggerHaptic("success");

    expect(vibrate).toHaveBeenCalledWith([10, 35, 12]);
    Reflect.deleteProperty(navigator, "vibrate");
  });

  it("does not throw when vibration is unavailable", () => {
    Reflect.deleteProperty(navigator, "vibrate");
    expect(() => triggerHaptic("light")).not.toThrow();
  });
});
