import { java } from "@/engine/steps";
import { PROBLEMS, type GridProblem, type GridAlgorithm } from "./types";
function scanSource(problem: GridProblem, algorithm: GridAlgorithm): string {
  const count = problem === "collect";
  const visit = `        int value = ${algorithm === "linear" ? "flat[index]" : "grid[r][c]"}; // @value
        boolean item = value == 2; // @item
        if (item) { // @ifItem
${count ? "          count = count + 1; // @count" : '          return r + " " + c; // @found'}
        }`;
  const head = count ? "    int count = 0; // @countInit\n" : "";
  let loop = "";
  if (algorithm === "linear")
    loop = `    int[] flat = new int[rows * cols]; // @flatAlloc
    int copy = 0; // @copyInit
    while (copy < flat.length) { // @copyCheck
      int r = copy / cols; // @copyR
      int c = copy % cols; // @copyC
      flat[copy] = grid[r][c]; // @copyCell
      copy = copy + 1; // @copyNext
    }
    int index = 0; // @indexInit
    while (index < flat.length) { // @indexCheck
      int r = index / cols; // @indexR
      int c = index % cols; // @indexC
${visit}
      index = index + 1; // @indexNext
    }`;
  else if (algorithm === "snake")
    loop = `    int r = 0; // @outerInit
    while (r < rows) { // @outerCheck
      boolean evenRow = r % 2 == 0; // @evenRow
      int delta;
      int c;
      if (evenRow) { // @ifEven
        delta = 1; // @forward
        c = 0; // @innerInitForward
      } else {
        delta = -1; // @backward
        c = cols - 1; // @innerInitBackward
      }
      while (c >= 0 && c < cols) { // @innerCheck
${visit}
        c = c + delta; // @innerNext
      }
      r = r + 1; // @outerNext
    }`;
  else {
    const outer = algorithm === "column" ? "c" : "r",
      inner = outer === "r" ? "c" : "r",
      outerLimit = outer === "r" ? "rows" : "cols",
      innerLimit = inner === "r" ? "rows" : "cols";
    loop = `    int ${outer} = 0; // @outerInit
    while (${outer} < ${outerLimit}) { // @outerCheck
      int ${inner} = 0; // @innerInit
      while (${inner} < ${innerLimit}) { // @innerCheck
${visit}
        ${inner} = ${inner} + 1; // @innerNext
      }
      ${outer} = ${outer} + 1; // @outerNext
    }`;
  }
  return `  static String solve(int[][] grid, int rows, int cols) {
${head}${loop}
    return ${count ? "Integer.toString(count)" : '"-1 -1"'}; // @scanReturn
  }`;
}
function frontierSource(
  problem: GridProblem,
  algorithm: GridAlgorithm,
): string {
  const island = problem === "islands",
    bfs = algorithm === "bfs",
    take = bfs ? "removeFirst" : "pop",
    put = bfs ? "addLast" : "push";
  const allocations = island
    ? ""
    : `    boolean[][] seen = new boolean[rows][cols]; // @seenAlloc
    int[][] dist = new int[rows][cols]; // @distAlloc
    int[][] parent = new int[rows][cols]; // @parentAlloc
    int initRow = 0; // @initRow
    while (initRow < rows) { // @initCheck
      Arrays.fill(dist[initRow], -1); // @fillDist
      Arrays.fill(parent[initRow], -1); // @fillParent
      initRow = initRow + 1; // @initNext
    }`;
  const target = island
    ? ""
    : `      boolean atTarget = r == tr && c == tc; // @atTarget
      if (atTarget) { // @ifTarget
        List<Integer> path = new ArrayList<>(); // @pathAlloc
        int node = id; // @traceInit
        while (node != -1) { // @traceCheck
          path.add(node); // @pathAdd
          int pr = node / cols; // @traceR
          int pc = node % cols; // @traceC
          node = parent[pr][pc]; // @traceParent
        }
        Collections.reverse(path); // @pathReverse
        return ${problem === "reach" ? '"YES"' : "Integer.toString(dist[r][c])"}; // @pathReturn
      }`;
  const walk = `${allocations}
    Deque<Integer> frontier = new ArrayDeque<>(); // @frontierAlloc
    seen[sr][sc] = true; // @seedSeen
${island ? "" : "    dist[sr][sc] = 0; // @seedDist\n"}    int seed = sr * cols + sc; // @seedId
    frontier.${put}(seed); // @seedPush
    while (!frontier.isEmpty()) { // @frontierCheck
      int id = frontier.${take}(); // @pop
      int r = id / cols; // @currentR
      int c = id % cols; // @currentC
${target}
      int direction = 0; // @directionInit
      while (direction < 4) { // @directionCheck
        int nr = r + DR[direction]; // @neighborR
        int nc = c + DC[direction]; // @neighborC
        boolean inside = nr >= 0 && nr < rows && nc >= 0 && nc < cols; // @bounds
        if (inside) { // @ifInside
          int terrain = grid[nr][nc]; // @terrain
          boolean passable = terrain ${island ? "== 1" : "!= 1"}; // @passable
          if (passable) { // @ifPassable
            boolean known = seen[nr][nc]; // @known
            if (!known) { // @ifNew
              seen[nr][nc] = true; // @markSeen
${
  island
    ? ""
    : `              dist[nr][nc] = dist[r][c] + 1; // @setDist
              parent[nr][nc] = id; // @setParent
`
}              int nextId = nr * cols + nc; // @nextId
              frontier.${put}(nextId); // @push
            }
          }
        }
        direction = direction + 1; // @directionNext
      }
    }`;
  if (!island)
    return `  static String solve(int[][] grid, int rows, int cols, int sr, int sc, int tr, int tc) {
${walk}
    return ${problem === "reach" ? '"NO"' : '"-1"'}; // @unreachable
  }`;
  return `  static void flood(int[][] grid, boolean[][] seen, int rows, int cols, int sr, int sc) {
${walk}
    return; // @floodReturn
  }
  static String solve(int[][] grid, int rows, int cols) {
    boolean[][] seen = new boolean[rows][cols]; // @islandSeenAlloc
    int count = 0; // @countInit
    int r = 0; // @outerInit
    while (r < rows) { // @outerCheck
      int c = 0; // @innerInit
      while (c < cols) { // @innerCheck
        int value = grid[r][c]; // @value
        boolean land = value == 1; // @land
        if (land) { // @ifLand
          boolean known = seen[r][c]; // @islandKnown
          if (!known) { // @ifIslandNew
            count = count + 1; // @count
            flood(grid, seen, rows, cols, r, c); // @floodCall
          }
        }
        c = c + 1; // @innerNext
      }
      r = r + 1; // @outerNext
    }
    return Integer.toString(count); // @scanReturn
  }`;
}
export function gridJava(problem: GridProblem, algorithm: GridAlgorithm) {
  if (!PROBLEMS[problem].algorithms.includes(algorithm))
    throw new Error("Cách duyệt không phù hợp với bài toán.");
  const graph = algorithm === "bfs" || algorithm === "dfs",
    points = PROBLEMS[problem].hasPoints;
  return java(`import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
// Local: java Main input.txt | Online judge: java Main (System.in).
public class Main {
  static BufferedReader reader = null; // @readerInitial
  static StringTokenizer tokens = null; // @tokensInitial
${
  graph
    ? `  static final int[] DR = {-1, 0, 1, 0}; // @dr
  static final int[] DC = {0, 1, 0, -1}; // @dc`
    : ""
}
  static int nextInt() throws IOException {
    while (tokens == null || !tokens.hasMoreTokens()) { // @tokenCheck
      String line = reader.readLine(); // @readLine
      if (line == null) { // @eofCheck
        throw new EOFException("Unexpected end of input");
      }
      tokens = new StringTokenizer(line); // @tokenize
    }
    String token = tokens.nextToken(); // @nextToken
    int value = Integer.parseInt(token); // @parseInt
    return value; // @returnInt
  }
${graph ? frontierSource(problem, algorithm) : scanSource(problem, algorithm)}
  public static void main(String[] args) throws Exception {
    InputStream source = System.in; // @source
    if (args.length > 0) { // @fileCheck
      source = new FileInputStream(args[0]); // @fileOpen
    }
    reader = new BufferedReader(new InputStreamReader(source, StandardCharsets.UTF_8)); // @openReader
    int tests = nextInt(); // @readTests
    int tc = 0; // @caseInit
    while (tc < tests) { // @caseCheck
      int rows = nextInt(); // @readRows
      int cols = nextInt(); // @readCols
${
  points
    ? `      int sr = nextInt(); // @readSr
      int sc = nextInt(); // @readSc
      int tr = nextInt(); // @readTr
      int tcGoal = nextInt(); // @readTc`
    : ""
}
      int[][] grid = new int[rows][cols]; // @gridAlloc
      int r = 0; // @inputRInit
      while (r < rows) { // @inputRCheck
        int c = 0; // @inputCInit
        while (c < cols) { // @inputCCheck
          grid[r][c] = nextInt(); // @readCell
          c = c + 1; // @inputCNext
        }
        r = r + 1; // @inputRNext
      }
      String result = solve(grid, rows, cols${points ? ", sr, sc, tr, tcGoal" : ""}); // @solveCall
      System.out.println(result); // @print
      tc = tc + 1; // @caseNext
    }
  }
}`);
}
