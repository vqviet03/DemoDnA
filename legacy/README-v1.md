# Java Data Structures · Visual Debug Lab

Giáo trình trực quan và tương tác bằng HTML, có 6 tab **ArrayList, LinkedList, Stack, Queue, Tree/BST, Graph**, tổng cộng **60 trạng thái debug**.

- Mỗi bước hiển thị đồng bộ mã Java, cấu trúc dữ liệu, giá trị biến và console.
- Nút Next / Previous / Play / Pause, timeline, các nhóm thao tác Tree và Graph.
- Giao diện responsive, chạy trực tiếp trong trình duyệt, không cần cài đặt hoặc thư viện bên ngoài.

## Xem giáo trình

**Triển khai hiện tại:** xem README ở thư mục gốc.

Tải repo rồi mở `index.html` nếu muốn chạy offline.

## Mã nguồn Java

`examples/VisualDebugDemos.java`: mã nguồn các ví dụ tương ứng với các trạng thái trực quan.

```bash
javac -encoding UTF-8 examples/VisualDebugDemos.java
java -cp examples VisualDebugDemos
```

## Deploy

Workflow tại `.github/workflows/deploy-pages.yml` deploy tự động từ nhánh `main` sang GitHub Pages. Nếu Pages chưa được bật, vào **Settings → Pages → Build and deployment → Source: GitHub Actions** rồi chạy lại workflow.

> Giáo trình phát lại các checkpoint debug đã chuẩn bị; không thực thi JVM trực tiếp trong trình duyệt.
