import { describe, expect, it } from "vitest";
import { formatBandwidth, formatBytes, formatTime } from "./format";

describe("formatTime", () => {
  it("formats zero seconds as 0:00", () => {
    expect(formatTime(0)).toBe("0:00");
  });

  it("formats seconds below a minute with leading zero on seconds", () => {
    expect(formatTime(5)).toBe("0:05");
    expect(formatTime(59)).toBe("0:59");
  });

  it("formats exactly one minute", () => {
    expect(formatTime(60)).toBe("1:00");
  });

  it("formats minutes and seconds together", () => {
    expect(formatTime(90)).toBe("1:30");
    expect(formatTime(125)).toBe("2:05");
  });

  it("formats large values (over an hour)", () => {
    expect(formatTime(3661)).toBe("61:01");
  });

  it("floors fractional seconds", () => {
    expect(formatTime(90.7)).toBe("1:30");
  });
});

describe("formatBandwidth", () => {
  it("formats zero as 0.0 Mbps", () => {
    expect(formatBandwidth(0)).toBe("0.0 Mbps");
  });

  it("formats sub-megabit values", () => {
    expect(formatBandwidth(500_000)).toBe("0.5 Mbps");
  });

  it("formats exact megabit values", () => {
    expect(formatBandwidth(5_000_000)).toBe("5.0 Mbps");
  });

  it("formats large values with one decimal", () => {
    expect(formatBandwidth(12_345_678)).toBe("12.3 Mbps");
  });
});

describe("formatBytes", () => {
  it("formats zero bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("formats values under 1 KB as bytes", () => {
    expect(formatBytes(500)).toBe("500.0 B");
  });

  it("formats kilobytes", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  it("formats megabytes", () => {
    expect(formatBytes(1_048_576)).toBe("1.0 MB");
    expect(formatBytes(2_621_440)).toBe("2.5 MB");
  });

  it("formats gigabytes", () => {
    expect(formatBytes(1_073_741_824)).toBe("1.0 GB");
  });
});
