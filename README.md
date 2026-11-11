# Ngũ Hành Giang Hồ

Game nhập vai võ hiệp 2D chạy trên trình duyệt, viết bằng JavaScript thuần và Canvas 2D (không thư viện, không file ảnh).

- 10 môn phái, mỗi hành 2 phái (cận chiến và viễn công)
- 40 chiêu thức thuộc 7 kiểu: chém, phóng đạn, nổ quanh thân, đánh vùng, lướt, lan truyền, tăng sức mạnh
- Ngũ hành tương khắc: đánh hành mình khắc +30% sát thương, đánh hành khắc mình −25%
- Hiệu ứng hành: Kim chảy máu, Mộc trúng độc, Thủy làm chậm, Hỏa thiêu đốt, Thổ choáng
- Bản đồ 5 vùng xếp theo vòng tương sinh, quái thường, thủ lĩnh và Ngũ Hành Yêu Vương đổi hành mỗi 7 giây
- Tự động đánh, bình máu/nội lực, bản đồ nhỏ, tự lưu tiến trình
- Tự giảm độ phân giải khi máy yếu để giữ khung hình mượt

## Chạy game

Mở `index.html` bằng trình duyệt (Chrome, Edge, Firefox, Safari).

Hoặc chạy một server tĩnh trong thư mục này:

```bash
python3 -m http.server 8000
```

rồi mở http://localhost:8000

## Điều khiển

| Phím | Tác dụng |
|---|---|
| WASD / mũi tên | Di chuyển |
| Nhấp chuột | Đi tới điểm, hoặc chọn quái và đánh |
| Space / J | Đánh thường |
| 1 2 3 | Chiêu thức |
| Q / E | Bình máu / bình nội lực |
| Tab | Đổi mục tiêu |
| Z | Tự động đánh |
| N | Bảng ngũ hành |
| F | Ẩn/hiện FPS |

Trên điện thoại: kéo nửa trái màn hình để di chuyển, chạm các nút chiêu bên phải.

## Cấu trúc

| File | Vai trò |
|---|---|
| `index.html` | Giao diện, CSS |
| `src/engine.js` | Lõi: toán học, sprite phát sáng, hạt, chữ bay, hẹn giờ, bàn phím |
| `src/data.js` | Dữ liệu cân bằng: ngũ hành, môn phái, chiêu thức, quái |
| `src/world.js` | Sinh bản đồ, mặt đất theo chunk, cây đá nhà hồ, va chạm |
| `src/actors.js` | Vẽ nhân vật, quái, icon kỹ năng |
| `src/vfx.js` | Hiệu ứng chiêu thức và hạt môi trường |
| `src/combat.js` | Sát thương, trạng thái, kỹ năng, đạn, AI quái |
| `src/game.js` | Vòng lặp, camera, điều khiển, HUD, lưu game |
