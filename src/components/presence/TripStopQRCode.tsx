import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface TripStopQRCodeProps {
  value: string;
  label: string;
}

/** QR سفر را در مرورگر تولید می‌کند؛ مقدار خام توکن فقط در خود QR است. */
export default function TripStopQRCode({ value, label }: TripStopQRCodeProps) {
  const [image, setImage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setImage(null);
    setFailed(false);
    void QRCode.toDataURL(value, {
      width: 192,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#073f56", light: "#ffffff" },
    }).then((result) => {
      if (active) setImage(result);
    }).catch(() => {
      if (active) setFailed(true);
    });

    return () => {
      active = false;
    };
  }, [value]);

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-teal-100 bg-white p-3">
      {image ? (
        <img src={image} alt={"کد QR تأیید حضور در " + label} className="h-24 w-24 rounded-lg" />
      ) : (
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-center text-[10px] font-bold text-slate-400">
          {failed ? "ساخت QR ناموفق بود" : "در حال ساخت QR…"}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-black text-slate-800">تأیید حضور در فروشگاه</p>
        <p className="mt-1 text-[11px] leading-5 text-slate-500">
          فروشنده با دوربین گوشی این کد را اسکن کند و پس از ورود به حساب فروشگاه، حضور شما را تأیید کند.
        </p>
      </div>
    </div>
  );
}
