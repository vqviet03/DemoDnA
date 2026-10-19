import java.util.*;

/** Six precise Java debug walkthroughs. Compile with javac VisualDebugDemos.java. */
public class VisualDebugDemos {
    static String view(String[] a) {
        StringJoiner j = new StringJoiner(", ", "[", "]");
        for (String v : a) j.add(v == null ? "_" : v);
        return j.toString();
    }
    static void log(String label, String message) {
        System.out.println(label + " | " + message);
    }
    static void array() {
        System.out.println("=== ARRAYLIST: MANG DONG ===");
        String[] data = {"A", "B"};
        int size = 2;
        log("A1", "size=2 capacity=2 data=" + view(data));
        String[] expanded = new String[4];
        expanded[0] = data[0];
        log("A2", "copy i=0 new=" + view(expanded));
        expanded[1] = data[1];
        log("A3", "copy i=1 new=" + view(expanded));
        data = expanded;
        log("A4", "capacity=4 data=" + view(data));
        data[size++] = "C";
        log("A5", "size=3 data=" + view(data));
        int index = 1;
        for (int i = size; i > index; i--) {
            data[i] = data[i-1];
            log("A" + (9-i), "shift i=" + i + " data=" + view(data));
        }
        data[index] = "X";
        size++;
        log("A8", "size=4 result=" + view(data));
    }
    static class LNode {
        final String value;
        LNode next;
        LNode(String v) { value = v; }
    }
    static String linked(LNode head) {
        StringJoiner j = new StringJoiner(" -> ");
        for (LNode p = head; p != null; p = p.next) j.add(p.value);
        return j + " -> null";
    }
    static void linked() {
        System.out.println("=== LINKEDLIST: NOI THAM CHIEU ===");
        LNode a = new LNode("A"), c = new LNode("C");
        a.next = c;
        log("L1", "head=" + linked(a));
        LNode b = new LNode("B");
        log("L2", "new B: B.next=null; head=" + linked(a));
        b.next = a.next;
        log("L3", "B.next=C; head=" + linked(a));
        a.next = b;
        log("L4", "A.next=B; head=" + linked(a));
        a.next = b.next;
        log("L5", "remove B; head=" + linked(a));
    }
    static void stack() {
        System.out.println("=== STACK: LIFO ===");
        Deque<String> stack = new ArrayDeque<>();
        log("S1", "stack=" + stack);
        stack.push("A"); log("S2", "push A -> " + stack);
        stack.push("B"); log("S3", "push B -> " + stack);
        stack.push("C"); log("S4", "push C -> " + stack);
        String top = stack.peek(); log("S5", "peek -> " + top + " stack=" + stack);
        String removed = stack.pop(); log("S6", "pop -> " + removed + " stack=" + stack);
    }
    static void queue() {
        System.out.println("=== QUEUE: FIFO ===");
        Queue<String> queue = new ArrayDeque<>();
        log("Q1", "queue=" + queue);
        queue.offer("A"); log("Q2", "offer A -> " + queue);
        queue.offer("B"); log("Q3", "offer B -> " + queue);
        queue.offer("C"); log("Q4", "offer C -> " + queue);
        String front = queue.peek(); log("Q5", "peek -> " + front + " queue=" + queue);
        String removed = queue.poll(); log("Q6", "poll -> " + removed + " queue=" + queue);
        queue.offer("D"); log("Q7", "offer D -> " + queue);
    }
    static class TNode {
        int key;
        TNode left, right;
        TNode(int key) { this.key = key; }
    }
    static TNode insert(TNode node, int key) {
        if (node == null) return new TNode(key);
        if (key < node.key) node.left = insert(node.left, key);
        else if (key > node.key) node.right = insert(node.right, key);
        return node;
    }
    static void inorder(TNode node, List<Integer> result) {
        if (node == null) return;
        inorder(node.left, result);
        result.add(node.key);
        log("T" + (13 + result.size()), "inorder visit=" + node.key + " result=" + result);
        inorder(node.right, result);
    }
    static void tree() {
        System.out.println("=== TREE: BST ===");
        TNode root = null;
        int[] values = {8, 3, 10, 1, 6, 14, 4, 7, 13};
        for (int i=0;i<values.length;i++) {
            root = insert(root, values[i]);
            log("T" + (i+1), "insert=" + values[i] + " count=" + (i+1));
        }
        int target = 7;
        TNode current = root;
        int step = 10;
        while (current != null) {
            log("T" + step++, "compare target=7 current=" + current.key +
                    (current.key == target ? " FOUND" : (target < current.key ? " -> LEFT" : " -> RIGHT")));
            if (current.key == target) break;
            current = target < current.key ? current.left : current.right;
        }
        List<Integer> result = new ArrayList<>();
        inorder(root, result);
        log("T23", "inorder complete=" + result);
    }
    static LinkedHashMap<String, List<String>> newGraph() {
        LinkedHashMap<String, List<String>> g = new LinkedHashMap<>();
        for (String key : List.of("A", "B", "C", "D", "E")) g.put(key, new ArrayList<>());
        String[][] edges = {{"A","B"},{"A","C"},{"B","D"},{"B","E"},{"C","E"}};
        for (String[] edge:edges) {g.get(edge[0]).add(edge[1]);g.get(edge[1]).add(edge[0]);}
        return g;
    }
    static void dfs(String current, Map<String,List<String>> g,
                    Set<String> seen, List<String> order) {
        if (!seen.add(current)) return;
        order.add(current);
        log("G"+(6+order.size()), "DFS visit="+current+" order="+order);
        for (String neighbor:g.get(current)) dfs(neighbor, g, seen, order);
    }
    static void graph() {
        System.out.println("=== GRAPH: BFS + DFS ===");
        Map<String,List<String>> g = newGraph();
        Deque<String> q = new ArrayDeque<>();
        Set<String> seen = new LinkedHashSet<>();
        List<String> order = new ArrayList<>();
        q.offer("A"); seen.add("A");
        log("G1", "BFS init queue="+q+" seen="+seen+" order="+order);
        int step = 2;
        while (!q.isEmpty()) {
            String cur = q.poll();
            order.add(cur);
            for (String neighbor : g.get(cur)) {
                if (seen.add(neighbor)) q.offer(neighbor);
            }
            log("G"+step++, "BFS visit="+cur+" queue="+q+" seen="+seen+" order="+order);
        }
        dfs("A",g,new LinkedHashSet<>(),new ArrayList<>());
    }
    public static void main(String[] args) {
        array(); linked(); stack(); queue(); tree(); graph();
    }
}