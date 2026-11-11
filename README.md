# Ngũ Hành Giang Hồ

Game nhập vai võ hiệp 2D chạy trên trình duyệt. Viết bằng JavaScript thuần và Canvas 2D: không thư viện, không file ảnh, mọi nhân vật và hiệu ứng đều vẽ bằng code.

## Cốt truyện

Tế đàn Ngũ Hành giữa Ngũ Hành Trấn giữ cân bằng cho năm vùng đất. Ngũ Hành Yêu Vương đã làm nó đảo loạn, yêu thú Kim, Mộc, Thủy, Hỏa, Thổ tràn ra khắp nơi. Bạn chọn một môn phái, làm theo nhiệm vụ của Trấn Trưởng Mạc Lão, mạnh lên qua từng vùng, gom trang bị kích hoạt ngũ hành, rồi tiến vào góc Đông Nam tru diệt Yêu Vương.

## Một vòng chơi

1. **Nhận nhiệm vụ.** Chuỗi 10 nhiệm vụ chính dẫn bạn qua từng vùng và dạy dần từng cơ chế. Khung nhiệm vụ nằm dưới bản đồ nhỏ, mũi tên vàng cạnh nhân vật chỉ đường.
2. **Ra vùng đánh quái.** Quái ở rìa vùng gần trấn yếu nhất, càng đi sâu cấp càng cao. Quái chết rơi lượng (tiền), bình thuốc và trang bị.
3. **Lên cấp, mở chiêu.** Mỗi phái có 4 chiêu: chiêu thứ ba mở ở cấp 3, tuyệt kỹ mở ở cấp 6.
4. **Mặc đồ, kích hoạt ngũ hành.** Xếp trang bị sao cho các món sinh ra nhau để mở thuộc tính ẩn.
5. **Về trấn tiếp tế.** Quái không vào trấn. Tiệm tạp hóa bán bình thuốc và mua lại đồ không dùng.
6. **Hạ thủ lĩnh, rồi hạ Yêu Vương.** Xong chuỗi chính, Trấn Trưởng giao lệnh truy nã lặp lại để tiếp tục kiếm đồ.

## Ngũ hành khi đánh nhau

- Đánh vào hành mình **khắc**: +30% sát thương. Đánh vào hành **khắc mình**: chỉ còn 75%.
- Mỗi đòn có thể gây hiệu ứng của hành: Kim chảy máu và giảm thủ, Mộc trúng độc cộng dồn 3 tầng, Thủy làm chậm, Hỏa thiêu đốt, Thổ gây choáng.
- Ngũ Hành Yêu Vương đổi hành mỗi 7 giây theo vòng tương sinh, buộc bạn phải canh lúc dồn sát thương và lúc lùi lại.

## Trang bị và kích hoạt ẩn

- 4 phẩm chất: **Thường**, **Tinh xảo**, **Hiếm**, **Hoàng Kim**. Phẩm càng cao càng nhiều dòng chỉ số ngẫu nhiên: % công, bạo kích, tốc độ chạy, sinh lực, nội lực, thủ, kháng một hành, tăng sát thương lên một hành.
- 5 ô trang bị xếp thành vòng: **Vũ khí → Y phục → Đầu → Hạng liên → Ngọc bội → Vũ khí**.
- Từ Tinh xảo trở lên, mỗi món có một **thuộc tính ẩn**. Thuộc tính ẩn chỉ sáng khi món đứng trước nó trong vòng có hành **sinh** ra hành của nó. Ví dụ Vũ khí hành Mộc làm sáng Y phục hành Hỏa, vì Mộc sinh Hỏa.
- Sáng đủ 5 món là **Ngũ Hành Viên Mãn**: thêm 10% công, 5% bạo kích, 5% tốc độ chạy.

## Môn phái

| Hành | Cận chiến | Viễn công |
|---|---|---|
| Kim | Kim Cương Viện (côn, hộ thể) | Ngân Tiễn Các (phi tiêu) |
| Mộc | Lâm Hiệp Trang (đao, nón lá) | Thanh Mộc Cốc (sáo, độc thuật) |
| Thủy | Lưu Thủy Kiếm Phái (kiếm) | Hàn Băng Cung (quạt, băng thuật) |
| Hỏa | Xích Diễm Bang (quyền chưởng) | Liệt Hỏa Đường (hỏa thuật) |
| Thổ | Hậu Thổ Sơn (trọng chùy) | Huyền Nham Các (thạch thuật) |

## Bản đồ

Năm vùng quanh Ngũ Hành Trấn, xếp theo vòng tương sinh.

| Vùng | Hướng | Yêu thú | Thủ lĩnh (cấp 12) |
|---|---|---|---|
| Hàn Băng Nguyên (Thủy) | Bắc | Tuyết Lang, Băng Linh | Hàn Băng Yêu Hồ |
| Thanh Lâm Cốc (Mộc) | Đông | Thụ Yêu, Độc Hoa Tinh | Cổ Mộc Thụ Vương |
| Xích Diễm Địa (Hỏa) | Đông Nam | Hỏa Hồ, Diễm Linh | Xích Viêm Ma Lang |
| Hoàng Thổ Lĩnh (Thổ) | Tây Nam | Nham Thạch Quái, Sa Lang | Sơn Thần Cự Thạch |
| Thu Kim Sơn (Kim) | Tây | Thiết Vệ Tàn Binh, Kim Linh | Kiếm Ma |

Ngũ Hành Yêu Vương (cấp 20) ở góc Đông Nam bản đồ.

## Chạy game

Mở `index.html` bằng trình duyệt (Chrome, Edge, Firefox, Safari).

Hoặc chạy một server tĩnh trong thư mục này:

```bash
python3 -m http.server 8000
```

rồi mở http://localhost:8000

Tiến trình (cấp, trang bị, túi đồ, lượng, nhiệm vụ) được tự lưu trong trình duyệt.

## Điều khiển

| Phím | Tác dụng |
|---|---|
| WASD / mũi tên | Di chuyển |
| Nhấp chuột | Đi tới điểm, chọn quái để đánh, hoặc nói chuyện với NPC |
| Space / J | Đánh thường (giữ để đánh liên tục) |
| 1 2 3 | Chiêu thức |
| Q / E | Bình máu / bình nội lực |
| R | Nói chuyện với NPC ở gần |
| I | Túi đồ |
| Tab | Đổi mục tiêu |
| Z | Tự động đánh (tự chọn quái, dùng chiêu, uống thuốc, nhặt đồ) |
| N | Bảng ngũ hành |
| H | Hướng dẫn trong game |
| F | Ẩn/hiện FPS |

Trên điện thoại: kéo nửa trái màn hình để di chuyển, chạm các nút chiêu bên phải, chạm NPC để nói chuyện.

## Cấu trúc code

| File | Vai trò |
|---|---|
| `index.html` | Giao diện, CSS, bảng hướng dẫn |
| `src/engine.js` | Lõi: toán học, sprite phát sáng, hạt, chữ bay, hẹn giờ, bàn phím |
| `src/data.js` | Dữ liệu cân bằng: ngũ hành, môn phái, chiêu thức, quái |
| `src/world.js` | Sinh bản đồ, mặt đất theo chunk, cây đá nhà hồ, va chạm |
| `src/actors.js` | Vẽ nhân vật, quái, icon kỹ năng |
| `src/vfx.js` | Hiệu ứng chiêu thức và hạt môi trường |
| `src/combat.js` | Sát thương, trạng thái, kỹ năng, đạn, AI quái |
| `src/rpg.js` | Trang bị, rơi đồ, túi đồ, NPC, hội thoại, nhiệm vụ, truy nã |
| `src/game.js` | Vòng lặp, camera, điều khiển, HUD, lưu game |
