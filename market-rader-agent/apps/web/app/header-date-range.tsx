"use client";

import { useEffect, useState } from "react";

import { DropdownSelect, type DropdownOption } from "./ui/dropdown-select";
import { Icon } from "./ui/icons";

const STORAGE_KEY = "market-radar:date-range";
const OPTIONS: readonly DropdownOption[] = [
  { value: "2025-09-01/2026-09-01", label: "2025-09-01 ~ 2026-09-01", description: "最近 1 年" },
  { value: "2022-01-01/2026-09-01", label: "2022-01-01 ~ 2026-09-01", description: "包含完整三年增长基线" },
  { value: "2021-09-01/2026-09-01", label: "2021-09-01 ~ 2026-09-01", description: "最近 5 年" },
];

export function HeaderDateRange(): React.JSX.Element {
  const [value, setValue] = useState("2022-01-01/2026-09-01");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null && OPTIONS.some((option) => option.value === stored)) setValue(stored);
  }, []);

  return (
    <DropdownSelect
      value={value}
      options={OPTIONS}
      onChange={(next) => {
        setValue(next);
        localStorage.setItem(STORAGE_KEY, next);
      }}
      leading={<Icon name="calendar" size={15} />}
      buttonClassName="daterange"
      wrapperClassName="header-date-range"
      menuAlign="right"
      ariaLabel="数据日期范围"
    />
  );
}
