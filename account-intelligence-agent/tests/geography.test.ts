import { describe, expect, it } from "vitest";
import { continentForCountry } from "../src/lib/geography";

describe("经验库地域维度", () => {
  it("按国家和地区归入对应大洲", () => {
    expect(continentForCountry("中国香港")).toBe("亚洲");
    expect(continentForCountry("英国")).toBe("欧洲");
    expect(continentForCountry("美国")).toBe("北美洲");
  });

  it("保留未知和缺失地域", () => {
    expect(continentForCountry("未知市场")).toBe("其他地区");
    expect(continentForCountry(null)).toBe("地区待补充");
  });
});
