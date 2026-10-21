import { java } from "@/engine/steps";
import { TREE_PROBLEMS, type TreeProblem, type TreeMethod } from "./types";
const build = `    static List<List<Integer>> buildChildren(int n, int[][] edges) {
        List<List<Integer>> children = new ArrayList<>(); // @childrenNew
        for (int id = 0; id <= n; id++) { // @childListLoop
            children.add(new ArrayList<>()); // @childListNew
        }
        for (int[] edge : edges) { // @buildEdgeLoop
            int u = edge[0]; // @buildU
            int v = edge[1]; // @buildV
            children.get(u).add(v); // @link
        }
        return children; // @childrenReturn
    }`;
const parent = `        int[] parent = new int[n + 1]; // @parentNew
        for (int[] edge : edges) { // @parentEdgeLoop
            int u = edge[0]; // @parentU
            int v = edge[1]; // @parentV
            parent[v] = u; // @parentSet
        }`;
const depth = `        int[] depth = new int[n + 1]; // @depthNew
        Arrays.fill(depth, -1); // @fillDepth
        depth[1] = 0; // @rootDepth`;
function traversal(problem: TreeProblem, dfs: boolean): string {
  return `        List<List<Integer>> children = buildChildren(n, edges); // @buildCall
${problem === "depth" ? depth : ""}
        Deque<Integer> work = new ArrayDeque<>(); // @dequeNew
        work.${dfs ? "push" : "offer"}(1); // @enqueueRoot
${problem === "leaves" ? "        int count = 0; // @countInit" : ""}
        while (!work.isEmpty()) { // @workCheck
            int node = work.${dfs ? "pop" : "poll"}(); // @pop
${
  problem === "leaves"
    ? `            if (children.get(node).isEmpty()) { // @isLeaf
                count++; // @leafInc
            }`
    : ""
}
${
  dfs
    ? `            for (int j = children.get(node).size() - 1; j >= 0; j--) { // @childLoop
                int child = children.get(node).get(j); // @childSelect`
    : `            for (int child : children.get(node)) { // @childLoop`
}
${problem === "depth" ? "                depth[child] = depth[node] + 1; // @depthWrite" : ""}
                work.${dfs ? "push" : "offer"}(child); // @push
            }
        }
${problem === "leaves" ? "        return count; // @return" : queryAnswers}`;
}
const queryAnswers = `        int[] answer = new int[queries.length]; // @answerNew
        for (int i = 0; i < queries.length; i++) { // @queryLoop
            int x = queries[i]; // @queryX
            answer[i] = depth[x]; // @answerWrite
        }
        return answer; // @return`;
export function treeSource(problem: TreeProblem, method: TreeMethod) {
  if (!TREE_PROBLEMS[problem].methods.includes(method))
    throw new Error("Cách giải không thuộc bài cây đã chọn.");
  let solve = "";
  if (method === "degree")
    solve = `        int[] degree = new int[n + 1]; // @degreeNew
        for (int[] edge : edges) { // @degreeEdgeLoop
            int u = edge[0]; // @degreeU
            degree[u]++; // @degreeInc
        }
        int count = 0; // @countInit
        for (int node = 1; node <= n; node++) { // @nodeLoop
            if (degree[node] == 0) { // @isLeaf
                count++; // @leafInc
            }
        }
        return count; // @return`;
  else if (method === "parents-set")
    solve = `        Set<Integer> parents = new HashSet<>(); // @setNew
        for (int[] edge : edges) { // @setEdgeLoop
            int u = edge[0]; // @setParent
            parents.add(u); // @setAdd
        }
        return n - parents.size(); // @setReturn`;
  else if (method === "parent-walk")
    solve = `${parent}
        int[] answer = new int[queries.length]; // @answerNew
        for (int i = 0; i < queries.length; i++) { // @queryLoop
            int x = queries[i]; // @queryX
            int node = x; // @walkStart
            int distance = 0; // @walkZero
            while (node != 1) { // @walkCheck
                node = parent[node]; // @walkParent
                distance++; // @walkInc
            }
            answer[i] = distance; // @answerWrite
        }
        return answer; // @return`;
  else if (method === "memo-depth")
    solve = `${parent}
${depth}
        int[] answer = new int[queries.length]; // @answerNew
        for (int i = 0; i < queries.length; i++) { // @queryLoop
            int x = queries[i]; // @queryX
            int node = x; // @memoNode
            Deque<Integer> path = new ArrayDeque<>(); // @memoPathNew
            while (depth[node] == -1) { // @memoUnknown
                path.push(node); // @memoPush
                node = parent[node]; // @memoParent
            }
            while (!path.isEmpty()) { // @memoUnwind
                node = path.pop(); // @memoPop
                depth[node] = depth[parent[node]] + 1; // @memoDepth
            }
            answer[i] = depth[x]; // @answerWrite
        }
        return answer; // @return`;
  else solve = traversal(problem, method.endsWith("dfs"));
  const usesChildren = [
    "leaf-bfs",
    "leaf-dfs",
    "depth-bfs",
    "depth-dfs",
  ].includes(method);
  return java(`import java.io.*;
import java.util.*;

// Standalone solution; nextInt is collapsed in the browser replay.
public class Main {
    static BufferedReader reader;
    static StringTokenizer tokenizer;
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
${problem === "depth" ? "            int q = nextInt(); // @queryCount" : ""}
            int[][] edges = new int[n - 1][2]; // @edgesNew
            for (int i = 0; i < n - 1; i++) { // @edgeLoop
                int u = nextInt(); // @readU
                int v = nextInt(); // @readV
                edges[i][0] = u; // @storeU
                edges[i][1] = v; // @storeV
            }
${
  problem === "depth"
    ? `            int[] queries = new int[q]; // @queriesNew
            for (int i = 0; i < q; i++) { // @queryReadLoop
                queries[i] = nextInt(); // @readQuery
            }
            int[] answer = solve(n, edges, queries); // @solveCall
            StringBuilder line = new StringBuilder("#" + tc + ":"); // @outputInit
            for (int value : answer) { // @outputLoop
                line.append(" ").append(value); // @outputAppend
            }
            System.out.println(line); // @print`
    : `            int answer = solve(n, edges); // @solveCall
            System.out.println("#" + tc + ": " + answer); // @print`
}
        }
    }
    static ${problem === "leaves" ? "int solve(int n, int[][] edges)" : "int[] solve(int n, int[][] edges, int[] queries)"} {
${solve}
    }
${usesChildren ? build : ""}
}`);
}
