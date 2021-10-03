import { shuffleArray } from "../app/util";

describe("utility functions", () => {
  describe("shuffleArray", () => {
    it("should work properly", async () => {
      const arr = [1, 2, 3, 4, 5];
      const res = shuffleArray(arr, 50);
      expect(res.length).toEqual(arr.length);
      expect(new Set(arr)).toStrictEqual(new Set(res));
    });
    it("should work for empty arrays", async () => {
      const arr: any[] = [];
      const res = shuffleArray(arr, 50);
      expect(res.length).toEqual(arr.length);
      expect(arr).toStrictEqual(res);
    });
    it("should work for arrays with single items", async () => {
      const arr: any[] = [1];
      const res = shuffleArray(arr, 50);
      expect(res.length).toEqual(arr.length);
      expect(arr).toStrictEqual(res);
    });
  });
});
