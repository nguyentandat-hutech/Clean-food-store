# 🥬 Clean Food Store — Hướng Dẫn Test API

> Tài liệu này hướng dẫn cách test toàn bộ 91 API endpoint của dự án Clean Food Store bằng Postman.

---

## 📋 Mục Lục

1. [Chuẩn bị môi trường](#1-chuẩn-bị-môi-trường)
2. [Import vào Postman](#2-import-vào-postman)
3. [Biến môi trường & collection](#3-biến-môi-trường--collection)
4. [Luồng test chuẩn (thứ tự)](#4-luồng-test-chuẩn-thứ-tự)
5. [Chi tiết từng folder](#5-chi-tiết-từng-folder)
   - [01. Health Check](#01-health-check)
   - [02. Auth (Xác thực)](#02-auth-xác-thực)
   - [03. Users (Người dùng)](#03-users-người-dùng)
   - [04. Farms (Nông trại)](#04-farms-nông-trại)
   - [05. Categories (Danh mục)](#05-categories-danh-mục)
   - [06. Products (Sản phẩm)](#06-products-sản-phẩm)
   - [07. Batches (Lô hàng)](#07-batches-lô-hàng)
   - [08. Inventory (Kho hàng)](#08-inventory-kho-hàng)
   - [09. Cart (Giỏ hàng)](#09-cart-giỏ-hàng)
   - [10. Orders (Đơn hàng)](#10-orders-đơn-hàng)
   - [11. Reviews (Đánh giá)](#11-reviews-đánh-giá)
   - [12. Discounts (Mã giảm giá)](#12-discounts-mã-giảm-giá)
   - [13. Stats (Thống kê)](#13-stats-thống-kê)
   - [14. Wishlist (Yêu thích)](#14-wishlist-yêu-thích)
   - [15. AI Scan (Quét độ tươi)](#15-ai-scan-quét-độ-tươi)
6. [Test thanh toán VNPay](#6-test-thanh-toán-vnpay)
7. [Seed Data nhanh](#7-seed-data-nhanh)
8. [Negative Tests (Test lỗi)](#8-negative-tests-test-lỗi)
9. [Chạy toàn bộ collection](#9-chạy-toàn-bộ-collection)

---

## 1. Chuẩn Bị Môi Trường

### Khởi động backend (Docker Compose)

```bash
# Từ thư mục gốc dự án
docker compose up -d

# Kiểm tra backend đã chạy
curl http://localhost:5000/api/health
# Mong đợi: { "status": "ok", "message": "Server is healthy" }
```

### Khởi động thủ công (không dùng Docker)

```bash
# Tạo file .env từ mẫu
cp .env.example .env
# Chỉnh sửa .env với thông tin MongoDB thực

# Cài dependencies
cd backend && npm install

# Chạy server
npm run dev
# Backend chạy tại: http://localhost:5000
```

### Yêu cầu

| Phần mềm | Phiên bản tối thiểu |
|----------|---------------------|
| Node.js  | 18+                 |
| MongoDB  | 6+                  |
| Postman  | 10+                 |
| Docker (tùy chọn) | 24+ |

---

## 2. Import Vào Postman

### Bước 1: Import Collection

1. Mở Postman → Click **Import** (góc trái trên)
2. Chọn file: `Clean-Food-Store.postman_collection.json`
3. Collection **🥬 Clean Food Store API — Full Test Suite** sẽ xuất hiện trong sidebar

### Bước 2: Import Environment

1. Click **Import** → chọn file `Clean-Food-Store.postman_environment.json`
2. Environment **🥬 Clean Food Store — Local Dev** sẽ xuất hiện
3. Chọn environment này ở góc phải trên Postman

### Bước 3: Kiểm tra Collection Variables

Collection đã có sẵn các biến sau (tự động điền khi chạy test):

| Biến | Mô tả | Tự động set từ |
|------|-------|---------------|
| `baseUrl` | `http://localhost:5000/api` | Cố định |
| `token` | JWT token của tài khoản hiện tại | Login |
| `adminToken` | JWT token Admin | Login Admin |
| `userToken` | JWT token User thường | Login User |
| `userId` | ID người dùng | Login |
| `farmId` | ID nông trại | Create Farm |
| `categoryId` | ID danh mục | Create Category |
| `productId` | ID sản phẩm | Create Product |
| `batchId` | ID lô hàng | Create Batch |
| `orderId` | ID đơn hàng COD | Checkout COD |
| `vnpayOrderId` | ID đơn hàng VNPay | Checkout VNPay |
| `reviewId` | ID đánh giá | Create Review |
| `discountId` | ID mã giảm giá | Create Discount |

---

## 3. Biến Môi Trường & Collection

### Cách hoạt động

- **Collection Variables**: Được tự động cập nhật bởi test scripts khi bạn chạy request. Ví dụ: sau khi chạy **Login**, biến `token` được set tự động.
- **Environment Variables**: Các giá trị cố định cho môi trường (URL, credentials test).

### Ưu tiên biến

`Environment` > `Collection` > Request-level

---

## 4. Luồng Test Chuẩn (Thứ Tự)

Chạy các request theo thứ tự sau để đảm bảo dữ liệu phụ thuộc được tạo đúng:

```
01. Health Check
    └─ Health Check

02. Auth
    ├─ Register (Admin)     → set adminToken, userId
    ├─ Login (Admin)        → set adminToken, token
    ├─ Register (User)      → tạo tài khoản user thường
    └─ Login (User)         → set userToken

03. Users
    ├─ Get Profile
    └─ Update Profile

04. Farms (Admin)
    ├─ Create Farm          → set farmId
    ├─ Get All Farms
    ├─ Get Farm By ID
    └─ Update Farm

05. Categories (Admin)
    ├─ Create Category      → set categoryId
    ├─ Get All Categories
    └─ Get Category By ID

06. Products (Admin)
    ├─ Create Product       → set productId  [cần farmId + categoryId]
    ├─ Get All Products
    ├─ Search Products
    └─ Get Product By ID

07. Batches (Admin)
    ├─ Create Batch         → set batchId    [cần productId]
    ├─ Get Batches By Product
    ├─ Get Inventory Report
    └─ Get Expiring Batches

08. Inventory
    └─ Get Inventory Alerts

09. Cart (User token)
    ├─ Add to Cart          [cần productId]
    ├─ Get Cart
    └─ Update Cart Item

10. Orders (User token)
    ├─ Checkout COD         → set orderId
    ├─ Checkout VNPay       → set vnpayOrderId
    ├─ Get My Orders
    ├─ Get Order By ID
    ├─ Update Order Status (Admin)
    ├─ Cancel Order
    ├─ Hủy Đơn Đã Hủy (Negative)
    ├─ VNPay IPN (test chữ ký sai → RspCode 97)
    ├─ VNPay Return (test chữ ký sai → 400)
    └─ Checkout VNPay giỏ trống (Negative)

11. Reviews (User token)
    ├─ Create Review        → set reviewId  [cần productId]
    ├─ Get Reviews By Product
    ├─ Update Review
    └─ Delete Review

12. Discounts (Admin)
    ├─ Create Discount      → set discountId
    ├─ Validate Discount
    ├─ Get All Discounts
    └─ Update Discount

13. Stats (Admin)
    ├─ Get Revenue
    ├─ Get Top Sellers
    └─ Get Expiring Soon

14. Wishlist (User token)
    ├─ Add to Wishlist       [cần productId]
    ├─ Get Wishlist
    ├─ Check Wishlist Item
    └─ Remove from Wishlist

15. AI Scan (nếu Python server chạy)
    └─ Upload ảnh rau củ để scan độ tươi
```

---

## 5. Chi Tiết Từng Folder

### 01. Health Check

**URL:** `GET /api/health`  
**Auth:** Không cần  
**Mô tả:** Kiểm tra server backend đang hoạt động  
**Response mong đợi:** `200 OK`  

```json
{ "status": "ok", "message": "Server is healthy" }
```

---

### 02. Auth (Xác thực)

#### Register

**URL:** `POST /api/auth/register`  
**Auth:** Không cần  
**Body:**
```json
{
  "name": "Nguyễn Văn Admin",
  "email": "admin@cleanfood.vn",
  "password": "Admin@123456",
  "role": "admin"
}
```
**Response:** `201` — trả về `{ user, token }`  
**Lưu ý:** Sau khi register, test script tự động lưu `adminToken`

#### Login

**URL:** `POST /api/auth/login`  
**Body:**
```json
{
  "email": "admin@cleanfood.vn",
  "password": "Admin@123456"
}
```
**Response:** `200` — trả về `{ user, token }`  

#### Get Me

**URL:** `GET /api/auth/me`  
**Auth:** Bearer token  
**Response:** `200` — thông tin người dùng hiện tại  

---

### 03. Users (Người dùng)

#### Get Profile

**URL:** `GET /api/users/profile`  
**Auth:** Bearer token  
**Response:** `200` — thông tin profile  

#### Update Profile

**URL:** `PUT /api/users/profile`  
**Auth:** Bearer token  
**Body:**
```json
{
  "name": "Nguyễn Văn Test (Đã cập nhật)",
  "phone": "0987654321"
}
```

---

### 04. Farms (Nông trại)

**Auth yêu cầu:** Admin token cho Create/Update/Delete  

#### Create Farm

**URL:** `POST /api/farms`  
**Body:**
```json
{
  "name": "Nông Trại Xanh Đà Lạt",
  "location": "Phường 4, TP. Đà Lạt, Lâm Đồng",
  "contactInfo": "0262 3822 456",
  "description": "Chuyên cung cấp rau củ quả hữu cơ từ vùng cao nguyên Lâm Đồng"
}
```
**Response:** `201` — farm vừa tạo, test script tự động lưu `farmId`

#### Get All Farms

**URL:** `GET /api/farms?page=1&limit=10`  
**Auth:** Không cần  

#### Update Farm

**URL:** `PUT /api/farms/{{farmId}}`  
**Auth:** Admin  

#### Delete Farm

**URL:** `DELETE /api/farms/{{farmId}}`  
**Auth:** Admin  
**Lưu ý:** Test negative — thử xóa farm không tồn tại → `404`

---

### 05. Categories (Danh mục)

**Auth yêu cầu:** Admin token cho Create/Update/Delete  

#### Create Category

**URL:** `POST /api/categories`  
**Body:**
```json
{
  "name": "Rau Củ Quả",
  "description": "Các loại rau tươi, củ và quả hữu cơ"
}
```
**Response:** `201`, test script tự động lưu `categoryId`

---

### 06. Products (Sản phẩm)

**Auth yêu cầu:** Admin token cho Create/Update/Delete  

#### Create Product

**URL:** `POST /api/products`  
**Body:**
```json
{
  "name": "Cà Chua Đà Lạt Organic",
  "description": "Cà chua bi đỏ hữu cơ trồng tại Đà Lạt, không thuốc trừ sâu",
  "price": 35000,
  "unit": "kg",
  "category": "{{categoryId}}",
  "farm": "{{farmId}}",
  "images": []
}
```
**Response:** `201`, test script tự động lưu `productId`  
**Lưu ý:** Sản phẩm mới chưa có tồn kho — cần tạo Batch.

#### Search Products

**URL:** `GET /api/products/search?q=cà chua`  
**Auth:** Không cần  
**Query params:** `q`, `category`, `farm`, `minPrice`, `maxPrice`, `page`, `limit`

---

### 07. Batches (Lô hàng)

**Auth yêu cầu:** Admin token cho Create/Update/Delete  

#### Create Batch

**URL:** `POST /api/batches`  
**Body:**
```json
{
  "productId": "{{productId}}",
  "quantity": 100,
  "costPrice": 20000,
  "expiryDate": "2025-12-31T00:00:00.000Z",
  "note": "Lô nhập đầu tháng từ nông trại Đà Lạt"
}
```
**Response:** `201`, test script tự động lưu `batchId`  
**Lưu ý:** Sau khi tạo batch, `effectiveStock` của sản phẩm sẽ tăng.

#### Get Inventory Report

**URL:** `GET /api/batches/inventory-report`  
**Auth:** Admin  
**Response:** Danh sách tồn kho theo sản phẩm (tổng hợp từ các lô)

#### Get Expiring Batches

**URL:** `GET /api/batches/expiring?days=30`  
**Auth:** Admin  
**Response:** Các lô hàng sắp hết hạn trong N ngày tới

---

### 08. Inventory (Kho hàng)

#### Get Inventory Alerts

**URL:** `GET /api/inventory/alerts`  
**Auth:** Admin  
**Response:** Danh sách sản phẩm sắp hết hàng (tồn kho <= ngưỡng cảnh báo)

---

### 09. Cart (Giỏ hàng)

**Auth yêu cầu:** User token (Bearer)  

#### Add to Cart

**URL:** `POST /api/cart`  
**Body:**
```json
{
  "productId": "{{productId}}",
  "quantity": 2
}
```

#### Get Cart

**URL:** `GET /api/cart`  

#### Update Cart Item

**URL:** `PUT /api/cart/{{productId}}`  
**Body:** `{ "quantity": 5 }`

#### Remove Cart Item

**URL:** `DELETE /api/cart/{{productId}}`

#### Clear Cart

**URL:** `DELETE /api/cart`

---

### 10. Orders (Đơn hàng)

**Auth yêu cầu:** User token cho tạo đơn; Admin token cho admin endpoints  

> ⚠️ **Quan trọng:** Giỏ hàng phải có sản phẩm trước khi checkout. Chạy **Add to Cart** trước.

#### Checkout COD

**URL:** `POST /api/orders/checkout`  
**Body:**
```json
{
  "shippingAddress": {
    "fullName": "Nguyễn Văn Test",
    "phone": "0901234567",
    "address": "123 Nguyễn Huệ, Quận 1, TP.HCM"
  },
  "note": "Giao giờ hành chính",
  "discountCode": ""
}
```
**Response:** `201` — trả về `{ order, ... }`  
**Test script:** Tự động lưu `orderId`

#### Checkout VNPay

**URL:** `POST /api/orders/checkout-vnpay`  
**Body:**
```json
{
  "shippingAddress": {
    "fullName": "Nguyễn Văn Test",
    "phone": "0901234567",
    "address": "456 Lê Lợi, Quận 3, TP.HCM"
  },
  "bankCode": "NCB",
  "note": "Thanh toán VNPay",
  "discountCode": ""
}
```
**Response:** `200` — trả về `{ order, paymentUrl }`  
**Test script:** Tự động lưu `vnpayOrderId`  
**Lưu ý:** Mở `paymentUrl` trên trình duyệt để hoàn tất thanh toán trên VNPay sandbox.

#### Get My Orders

**URL:** `GET /api/orders?page=1&limit=10&status=Pending`  
**Query params:** `page`, `limit`, `status` (Pending/Paid/Processing/Shipping/Delivered/Cancelled)

#### Get Order By ID

**URL:** `GET /api/orders/{{orderId}}`

#### Get All Orders (Admin)

**URL:** `GET /api/orders/admin/all?page=1&limit=20`  
**Auth:** Admin  
**Query params bổ sung:** `status`, `userId`

#### Update Order Status (Admin)

**URL:** `PATCH /api/orders/{{orderId}}/status`  
**Body:** `{ "status": "Processing" }`  
**Workflow trạng thái:**
```
Pending → Processing → Shipping → Delivered
Pending/Paid/Processing → Cancelled (bởi Admin)
Pending → Cancelled (bởi User qua /cancel)
```

#### Cancel Order

**URL:** `PATCH /api/orders/{{orderId}}/cancel`  
**Auth:** User token  
**Lưu ý:** Chỉ hủy được đơn ở trạng thái `Pending`

---

### 11. Reviews (Đánh giá)

**Auth yêu cầu:** User token  

#### Create Review

**URL:** `POST /api/reviews`  
**Body:**
```json
{
  "productId": "{{productId}}",
  "rating": 5,
  "comment": "Cà chua rất tươi ngon, đóng gói cẩn thận. Sẽ mua lại!"
}
```
**Response:** `201`, test script tự động lưu `reviewId`

#### Get Reviews By Product

**URL:** `GET /api/reviews/product/{{productId}}?page=1&limit=10`  
**Auth:** Không cần  

---

### 12. Discounts (Mã giảm giá)

**Auth yêu cầu:** Admin token cho Create/Update/Delete  

#### Create Discount

**URL:** `POST /api/discounts`  
**Body:**
```json
{
  "code": "SALE10",
  "type": "percentage",
  "value": 10,
  "minOrderValue": 100000,
  "maxUses": 100,
  "startDate": "2025-01-01T00:00:00.000Z",
  "endDate": "2025-12-31T23:59:59.000Z",
  "description": "Giảm 10% cho đơn từ 100.000đ"
}
```
**Loại discount:** `percentage` (%) hoặc `fixed` (tiền cố định)

#### Validate Discount

**URL:** `POST /api/discounts/validate`  
**Auth:** User token  
**Body:**
```json
{
  "code": "SALE10",
  "orderValue": 150000
}
```

---

### 13. Stats (Thống kê)

**Auth yêu cầu:** Admin token  

#### Get Revenue

**URL:** `GET /api/stats/revenue?period=month&year=2025`  
**Query params:** `period` (day/week/month/year), `year`, `month`

#### Get Top Sellers

**URL:** `GET /api/stats/top-sellers?limit=10&period=month`

#### Get Expiring Soon

**URL:** `GET /api/stats/expiring-soon?days=7`

---

### 14. Wishlist (Yêu thích)

**Auth yêu cầu:** User token  

#### Add to Wishlist

**URL:** `POST /api/wishlist/{{productId}}`  
**Response:** `200` — wishlist đã thêm sản phẩm

#### Get Wishlist

**URL:** `GET /api/wishlist`  
**Response:** Danh sách sản phẩm yêu thích với thông tin chi tiết

#### Check Wishlist Item

**URL:** `GET /api/wishlist/check/{{productId}}`  
**Response:** `{ "inWishlist": true/false }`

#### Remove from Wishlist

**URL:** `DELETE /api/wishlist/{{productId}}`

---

### 15. AI Scan (Quét độ tươi)

**Auth yêu cầu:** User token  
**Yêu cầu bổ sung:** Python YOLO server phải đang chạy (`cd backend/python && python freshness_server.py`)  

#### Scan Image

**URL:** `POST /api/ai/scan`  
**Body:** `form-data` với field `image` là file ảnh (jpg/png)  
**Response:** `200` — kết quả phân loại độ tươi của sản phẩm

---

## 6. Test Thanh Toán VNPay

### Tổng quan

VNPay hoạt động theo luồng **redirect** — backend tạo URL, user thanh toán trên trang VNPay, VNPay gọi callback về backend:

```
User → POST /checkout-vnpay → Backend → [tạo order + URL]
                                               ↓
User mở paymentUrl trên trình duyệt → VNPay sandbox
                                               ↓
                        ┌──────────────────────┤
                        ↓                      ↓
            GET /vnpay-ipn           GET /vnpay-return
         (server-to-server)       (redirect trình duyệt)
         [xác nhận + trừ kho]    [hiển thị kết quả cho user]
```

### Bước 1: Tạo đơn hàng VNPay

1. Thêm sản phẩm vào giỏ hàng (Add to Cart)
2. Chạy request **Checkout VNPay**
3. Copy giá trị `paymentUrl` từ response

### Bước 2: Thanh toán trên VNPay Sandbox

1. Mở `paymentUrl` trên trình duyệt
2. Chọn ngân hàng **NCB** (nếu chưa chọn bankCode)
3. Điền thông tin thẻ test:

| Trường | Giá trị |
|--------|---------|
| Số thẻ | `9704198526191432198` |
| Tên chủ thẻ | `NGUYEN VAN A` |
| Ngày hết hạn | `07/15` |
| Mật khẩu OTP | `123456` |

4. Xác nhận thanh toán — VNPay sẽ redirect về `VNP_RETURN_URL`

### Bước 3: Xác nhận kết quả

Sau khi thanh toán thành công:
- **IPN callback** (`GET /vnpay-ipn`): VNPay gọi tự động để xác nhận, backend trừ kho và cập nhật trạng thái đơn thành `Paid`
- **Return URL** (`GET /vnpay-return`): Người dùng được redirect về frontend với kết quả thanh toán

### Kiểm tra kết quả trong Postman

```
# Lấy thông tin đơn hàng VNPay vừa thanh toán
GET {{baseUrl}}/orders/{{vnpayOrderId}}
# Mong đợi: status = "Paid", payment.status = "success"
```

### Test chữ ký không hợp lệ (tự động trong collection)

| Request | Mong đợi | Lý do |
|---------|----------|-------|
| VNPay IPN — Chữ ký không hợp lệ | `200 { RspCode: "97" }` | IPN luôn trả HTTP 200, báo lỗi qua RspCode |
| VNPay Return — Chữ ký không hợp lệ | `400` | Return URL throw lỗi nếu chữ ký sai |

---

## 7. Seed Data Nhanh

Chạy lần lượt các request sau để có dữ liệu đầy đủ cho test:

```
1. Register (Admin)      — email: admin@cleanfood.vn
2. Login (Admin)         — lưu adminToken
3. Register (User)       — email: user@cleanfood.vn
4. Login (User)          — lưu userToken
5. Create Farm           — Nông Trại Xanh Đà Lạt
6. Create Category       — Rau Củ Quả
7. Create Product        — Cà Chua Đà Lạt
8. Create Batch          — 100kg, hết hạn cuối năm
9. [Chuyển sang User token]
10. Add to Cart          — thêm 2kg cà chua
11. Checkout COD         — lưu orderId
12. Add to Cart          — thêm lại 2kg cà chua
13. Checkout VNPay       — lưu vnpayOrderId + paymentUrl
14. Create Discount      — SALE10 (10% off)
15. Create Review        — 5 sao
16. Add to Wishlist
```

### Lưu ý về token

Sau khi đăng nhập Admin:
- Biến `token` = adminToken (dùng cho các request có Auth)
- Biến `adminToken` = cũng được lưu riêng

Khi test endpoint User, chạy **Login (User)** để cập nhật `token` = userToken.

---

## 8. Negative Tests (Test lỗi)

Collection đã bao gồm các test case lỗi:

| Request | Mong đợi | Mô tả |
|---------|----------|-------|
| Get Cart — No Token | `401` | Truy cập endpoint protected không có token |
| Get My Orders — No Token | `401` | Tương tự |
| Create Farm — No Admin | `403` | User thường không có quyền Admin |
| Hủy Đơn Hàng Đã Hủy | `400` | Không thể hủy đơn đã Cancelled |
| Checkout VNPay — Giỏ Trống | `400` | Giỏ hàng trống, không thể checkout |
| VNPay IPN — Chữ Ký Sai | `200 + RspCode:97` | Chữ ký HMAC không hợp lệ |
| VNPay Return — Chữ Ký Sai | `400` | Chữ ký không hợp lệ, từ chối xử lý |
| Delete Farm — Not Found | `404` | Farm không tồn tại |
| Get Product — Not Found | `404` | Product không tồn tại |

---

## 9. Chạy Toàn Bộ Collection

### Dùng Collection Runner (Postman)

1. Click vào collection **🥬 Clean Food Store API — Full Test Suite**
2. Click **Run collection**
3. Giữ nguyên thứ tự mặc định
4. Chọn **Number of iterations**: 1
5. Delay: 200ms (tránh MongoDB overload)
6. Click **Run**

### Dùng Newman (CLI)

```bash
# Cài Newman
npm install -g newman

# Chạy toàn bộ collection
newman run Clean-Food-Store.postman_collection.json \
  -e Clean-Food-Store.postman_environment.json \
  --delay-request 200 \
  --reporters cli,json \
  --reporter-json-export newman-report.json

# Xem báo cáo
cat newman-report.json
```

### Kết quả mong đợi

- 91 requests chạy thành công
- Tất cả test assertions đều pass
- Folder **Orders** bao gồm các test VNPay validation đầy đủ

---

## 📝 Ghi chú kỹ thuật

### VNPay Webhook (IPN)

- VNPay IPN được gọi từ server VNPay → server backend (không qua trình duyệt)
- Khi test local, VNPay **không thể gọi về** `localhost` → IPN sẽ không tự động trigger
- Giải pháp: Dùng **ngrok** hoặc **Cloudflare Tunnel** để expose localhost ra internet
  ```bash
  ngrok http 5000
  # Copy URL ngrok → cập nhật VNP_IPN_URL trong .env
  ```

### Xử lý Stock theo FIFO

- Khi đặt hàng COD: kho bị trừ **ngay lập tức** theo thứ tự hết hạn sớm nhất
- Khi đặt hàng VNPay: kho KHÔNG bị trừ cho đến khi IPN xác nhận thanh toán thành công
- Khi hủy đơn COD (Pending): kho được **hoàn lại**
- Khi hủy đơn VNPay (Pending, chưa thanh toán): không cần hoàn kho

### Order Status Flow

```
COD:   Pending → Processing → Shipping → Delivered
                    └────────────────────────────► Cancelled (Admin)
       Pending ──────────────────────────────────► Cancelled (User)

VNPay: Pending → [IPN success] → Paid → Processing → Shipping → Delivered
       Pending → [IPN failed]  → Cancelled
       Pending ──────────────────────────────────► Cancelled (User, chưa TT)
```

### Authentication Flow

```
POST /auth/register  → { user, token }  (JWT 7 ngày)
POST /auth/login     → { user, token }  (JWT 7 ngày)
GET  /auth/me        → { user }         (Bearer token required)
```

---

*Tài liệu được tạo tự động cho dự án Clean Food Store. Cập nhật lần cuối: 2025.*
