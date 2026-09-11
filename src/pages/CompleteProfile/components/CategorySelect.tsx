import React from "react";
import CategoryField from "../../../components/category/CategoryField";

interface CategorySelectProps {
  value: string;
  onChange: (v: string) => void;
  storeName: string;
}

export default function CategorySelect({ value, onChange, storeName }: CategorySelectProps) {
  return (
    <CategoryField
      value={value}
      onChange={onChange}
      label="صنف فعالیت"
      required
      placeholder={storeName ? `صنف «${storeName}» را انتخاب کنید` : "جستجوی صنف فروشگاه..."}
    />
  );
}
