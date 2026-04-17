import { describe, it, expect, beforeAll } from "vitest";
import { loadCodeGS } from "./helpers.mjs";

let gs;

beforeAll(() => {
  gs = loadCodeGS();
});

function makeRecorder() {
  const calls = [];
  return {
    getRange(row, col, numRows, numCols) {
      return {
        setValues(vals) {
          calls.push({ row, col, numRows: numRows ?? 1, numCols: numCols ?? 1, values: vals });
        },
        setValue(val) {
          calls.push({ row, col, value: val });
        },
      };
    },
    calls,
  };
}

describe("writeFieldResults", () => {
  it("makes zero calls for empty resultMap", () => {
    const ss = makeRecorder();
    gs.writeFieldResults(ss, 1, {});
    expect(ss.calls).toHaveLength(0);
  });

  it("writes single entry at correct row offset (+2 for header + 1-index)", () => {
    const ss = makeRecorder();
    gs.writeFieldResults(ss, 3, { 5: "pk_value" });
    expect(ss.calls).toHaveLength(1);
    expect(ss.calls[0].row).toBe(7); // 5 + 2
    expect(ss.calls[0].col).toBe(3);
    expect(ss.calls[0].values).toEqual([["pk_value"]]);
  });

  it("batches fully contiguous rows into single setValues call", () => {
    const ss = makeRecorder();
    gs.writeFieldResults(ss, 1, { 0: "a", 1: "b", 2: "c" });
    expect(ss.calls).toHaveLength(1);
    expect(ss.calls[0].row).toBe(2); // 0 + 2
    expect(ss.calls[0].numRows).toBe(3);
    expect(ss.calls[0].values).toEqual([["a"], ["b"], ["c"]]);
  });

  it("splits on gaps into separate setValues calls", () => {
    const ss = makeRecorder();
    gs.writeFieldResults(ss, 1, { 0: "a", 1: "b", 5: "c", 6: "d" });
    expect(ss.calls).toHaveLength(2);
    // First range: rows 0-1 (sheet rows 2-3)
    expect(ss.calls[0]).toMatchObject({ row: 2, numRows: 2 });
    expect(ss.calls[0].values).toEqual([["a"], ["b"]]);
    // Second range: rows 5-6 (sheet rows 7-8)
    expect(ss.calls[1]).toMatchObject({ row: 7, numRows: 2 });
    expect(ss.calls[1].values).toEqual([["c"], ["d"]]);
  });

  it("handles all single-element ranges (no contiguous rows)", () => {
    const ss = makeRecorder();
    gs.writeFieldResults(ss, 1, { 0: "a", 3: "b", 7: "c" });
    expect(ss.calls).toHaveLength(3);
    expect(ss.calls[0]).toMatchObject({ row: 2, numRows: 1, values: [["a"]] });
    expect(ss.calls[1]).toMatchObject({ row: 5, numRows: 1, values: [["b"]] });
    expect(ss.calls[2]).toMatchObject({ row: 9, numRows: 1, values: [["c"]] });
  });

  it("sorts out-of-order numeric keys", () => {
    const ss = makeRecorder();
    gs.writeFieldResults(ss, 1, { 5: "e", 2: "b", 0: "a", 1: "c", 3: "d" });
    // Sorted: 0,1,2,3,5 → contiguous 0-3 and single 5
    expect(ss.calls).toHaveLength(2);
    expect(ss.calls[0]).toMatchObject({ row: 2, numRows: 4 });
    expect(ss.calls[0].values).toEqual([["a"], ["c"], ["b"], ["d"]]);
    expect(ss.calls[1]).toMatchObject({ row: 7, numRows: 1, values: [["e"]] });
  });

  it("handles large contiguous block efficiently", () => {
    const ss = makeRecorder();
    const resultMap = {};
    for (let i = 0; i < 500; i++) resultMap[i] = `val_${i}`;
    gs.writeFieldResults(ss, 1, resultMap);
    expect(ss.calls).toHaveLength(1);
    expect(ss.calls[0].numRows).toBe(500);
    expect(ss.calls[0].row).toBe(2);
  });

  it("handles multiple gaps in sequence", () => {
    const ss = makeRecorder();
    gs.writeFieldResults(ss, 2, { 10: "a", 11: "b", 13: "c", 15: "d", 16: "e", 17: "f" });
    expect(ss.calls).toHaveLength(3);
    expect(ss.calls[0]).toMatchObject({ row: 12, numRows: 2 }); // 10-11
    expect(ss.calls[1]).toMatchObject({ row: 15, numRows: 1 }); // 13
    expect(ss.calls[2]).toMatchObject({ row: 17, numRows: 3 }); // 15-17
  });
});
