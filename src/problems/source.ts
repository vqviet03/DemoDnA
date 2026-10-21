import { java } from "@/engine/steps";
import type { MethodId, ProblemId } from "./types";
const signMethods: Record<string, string> = {
  mask: `    static boolean accepts(int[] values, int k, int target) {
        int limit = 1 << k; // @limit
        for (int mask = 0; mask < limit; mask++) { // @maskLoop
            int sum = 0; // @sumZero
            for (int j = 0; j < k; j++) { // @signLoop
                boolean plus = (mask & (1 << j)) != 0; // @plus
                if (plus) { // @ifPlus
                    sum += values[j]; // @add
                } else {
                    sum -= values[j]; // @subtract
                }
            }
            if (sum == target) { // @match
                return true; // @yes
            }
        }
        return false; // @no
    }`,
  subset: `    static boolean accepts(int[] values, int k, int target) {
        int total = 0; // @totalZero
        for (int j = 0; j < k; j++) { // @totalLoop
            total += values[j]; // @totalAdd
        }
        int adjusted = target + total; // @adjusted
        if (adjusted % 2 != 0) { // @odd
            return false; // @oddReturn
        }
        int wanted = adjusted / 2; // @wanted
        int limit = 1 << k; // @limit
        for (int mask = 0; mask < limit; mask++) { // @maskLoop
            int sum = 0; // @sumZero
            for (int j = 0; j < k; j++) { // @signLoop
                boolean plus = (mask & (1 << j)) != 0; // @plus
                if (plus) { // @ifPlus
                    sum += values[j]; // @add
                }
            }
            if (sum == wanted) { // @match
                return true; // @yes
            }
        }
        return false; // @no
    }`,
  dfs: `    static boolean accepts(int[] values, int k, int target) {
        return choose(values, k, target, 0, 0); // @startDfs
    }
    static boolean choose(int[] values, int k, int target, int depth, int sum) {
        if (depth == k) { // @leaf
            return sum == target; // @leafReturn
        }
        int next = sum + values[depth]; // @dfsPlus
        boolean found = choose(values, k, target, depth + 1, next); // @recursePlus
        if (found) { // @found
            return true; // @dfsYes
        }
        next = sum - values[depth]; // @dfsMinus
        return choose(values, k, target, depth + 1, next); // @recurseMinus
    }`,
};
const colorSolve = `    static int solve(int[][] a, int parts) {
        int count = 0; // @countZero
        for (int r = 0; r < a.length; r++) { // @rowLoop
            for (int c = 0; c < a[0].length; c++) { // @colLoop
                int[] values = new int[4]; // @values
                int k = 0; // @kZero
                for (int d = 0; d < 4; d++) { // @neighborLoop
                    int nr = r + DR[d]; // @nr
                    int nc = c + DC[d]; // @nc
                    boolean inside = nr >= 0 && nr < a.length && nc >= 0 && nc < a[0].length; // @inside
                    if (inside) { // @ifInside
                        values[k] = a[nr][nc]; // @readNeighbor
                        k++; // @kNext
                    }
                }
                boolean ok = accepts(values, k, a[r][c]); // @accept
                if (ok) { // @ifOk
                    count++; // @countNext
                }
            }
        }
        return count; // @return
    }`;
const folded: Record<string, string> = {
  fold: `        int[][] current = new int[n][width]; // @currentNew
        for (int r = 0; r < n; r++) { // @copyRow
            for (int c = 0; c < width; c++) { // @copyCol
                current[r][c] = a[r][(parts - 1) * width + c]; // @copy
            }
        }
        for (int block = parts - 2; block >= 0; block--) { // @blockLoop
            current = foldLeft(current, a, block, width); // @fold
        }
        int[][] result = current; // @resultAssign`,
  mapping: `        int[][] result = new int[n][width]; // @resultNew
        for (int r = 0; r < n; r++) { // @mapRow
            for (int c = 0; c < n; c++) { // @mapCol
                int block = c / width; // @block
                int local = c % width; // @local
                int dest = local; // @dest
                if (block % 2 != 0) { // @reverseCheck
                    dest = width - 1 - local; // @reverse
                }
                result[r][dest] += a[r][c]; // @accumulate
            }
        }`,
  layers: `        int[][] result = new int[n][width]; // @resultNew
        for (int r = 0; r < n; r++) { // @layerRow
            for (int dest = 0; dest < width; dest++) { // @layerDest
                for (int block = 0; block < parts; block++) { // @layerBlock
                    int local = dest; // @layerLocal
                    if (block % 2 != 0) { // @layerReverseCheck
                        local = width - 1 - dest; // @layerReverse
                    }
                    int c = block * width + local; // @sourceCol
                    result[r][dest] += a[r][c]; // @layerAdd
                }
            }
        }`,
};
const helper = `    static int[][] foldLeft(int[][] current, int[][] a, int block, int width) {
        int[][] next = new int[a.length][width]; // @nextNew
        for (int r = 0; r < a.length; r++) { // @foldRow
            for (int c = 0; c < width; c++) { // @foldCol
                int mirrored = width - 1 - c; // @mirrored
                int left = a[r][block * width + c]; // @leftValue
                int right = current[r][mirrored]; // @rightValue
                next[r][c] = left + right; // @foldAdd
            }
        }
        return next; // @foldReturn
    }`;
export function problemSource(problem: ProblemId, method: MethodId) {
  if (
    problem === "coloring"
      ? !["mask", "dfs", "subset"].includes(method)
      : !["fold", "mapping", "layers"].includes(method)
  )
    throw new Error("Cách giải không thuộc bài toán.");
  return java(`import java.io.*;
import java.util.*;

// Step replay; helper nextInt is collapsed in the browser debugger.
public class Main {
    static BufferedReader reader;
    static StringTokenizer tokenizer;
${problem === "coloring" ? "    static final int[] DR = {-1, 0, 1, 0};\n    static final int[] DC = {0, 1, 0, -1};" : ""}
    static int nextInt() throws IOException {
        while (tokenizer == null || !tokenizer.hasMoreTokens()) {
            String line = reader.readLine();
            if (line == null) {
                throw new EOFException("Missing input");
            }
            tokenizer = new StringTokenizer(line);
        }
        return Integer.parseInt(tokenizer.nextToken());
    }
    public static void main(String[] args) throws Exception {
        InputStream stream = System.in;
        if (args.length > 0) {
            stream = new FileInputStream(args[0]);
        }
        reader = new BufferedReader(new InputStreamReader(stream));
        int tests = nextInt(); // @tests
        for (int tc = 1; tc <= tests; tc++) { // @testLoop
            int n = nextInt(); // @n
            int m = nextInt(); // @m
            int cols = ${problem === "coloring" ? "m" : "n"}; // @cols
            int[][] a = new int[n][cols]; // @allocate
            for (int r = 0; r < n; r++) { // @inputRow
                for (int c = 0; c < cols; c++) { // @inputCol
                    a[r][c] = nextInt(); // @read
                }
            }
            int answer = solve(a, ${problem === "coloring" ? "1" : "m"}); // @solve
            System.out.println("#" + tc + " " + answer); // @print
        }
    }
${
  problem === "coloring"
    ? colorSolve + "\n" + signMethods[method]
    : `    static int solve(int[][] a, int parts) {
        int n = a.length; // @solveN
        int width = n / parts; // @width
${folded[method]}
        int best = 0; // @bestZero
        for (int r = 0; r < n; r++) { // @maxRow
            for (int c = 0; c < width; c++) { // @maxCol
                best = Math.max(best, result[r][c]); // @best
            }
        }
        return best; // @return
    }${method === "fold" ? "\n" + helper : ""}`
}
}`);
}
