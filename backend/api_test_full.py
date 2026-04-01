"""
================================================================
api_test_full.py — Kiểm tra 100% API của Clean Food Store Backend
Express Node.js — port 5000

Luồng test:
  1. Đăng ký admin + user test
  2. Dùng docker exec mongo → set role admin
  3. Login lấy token
  4. Test toàn bộ 59 endpoints (Public / User / Admin)
  5. Cleanup dữ liệu test
  6. In báo cáo tổng hợp

Chạy: python api_test_full.py
================================================================
"""
import json
import subprocess
import sys
import time
import uuid
from datetime import datetime, timedelta
from pathlib import Path

import requests

# ── Cấu hình ─────────────────────────────────────────────────
BASE = "http://localhost:5000/api"
TIMEOUT = 15
UNIQUE = uuid.uuid4().hex[:8]   # Tránh trùng email/mã khi chạy nhiều lần

ADMIN_EMAIL = f"testadmin_{UNIQUE}@cleanfood.test"
ADMIN_PASS  = "Admin@123!"
ADMIN_NAME  = "Test Admin"

USER_EMAIL  = f"testuser_{UNIQUE}@cleanfood.test"
USER_PASS   = "User@123!"
USER_NAME   = "Test User"

# Hình ảnh giả cho multipart upload
FAKE_IMAGE_PATH = Path(__file__).parent / "freshbanana.jpg"

# ── Bảng kết quả ─────────────────────────────────────────────
results = []   # list of (group, name, method, url, status, passed, note)
IDS = {}       # lưu ID tạo ra trong quá trình test


# ══════════════════════════════════════════════════════════════
# Helpers
# ══════════════════════════════════════════════════════════════

def h(token=None):
    """Header chuẩn với hoặc không có Bearer."""
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def record(group, name, method, url, resp, note=""):
    """Ghi nhận kết quả 1 test case."""
    try:
        status = resp.status_code
        # Thành công khi status 2xx
        passed = 200 <= status < 300
        body_preview = resp.text[:120].replace("\n", " ")
    except Exception as e:
        status = 0
        passed = False
        body_preview = str(e)
    results.append((group, name, method, url, status, passed, note or body_preview))
    mark = "✅" if passed else "❌"
    print(f"  {mark} [{status}] {method:6} {url.replace(BASE, '')} — {name}")
    return passed, (resp if passed else None)


def api(method, path, token=None, json_body=None, files=None, params=None, data=None):
    """Thực hiện HTTP request."""
    url = f"{BASE}{path}"
    headers = {}
    if token and files is None:
        headers["Authorization"] = f"Bearer {token}"
    elif token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        resp = requests.request(
            method, url,
            headers=headers,
            json=json_body,
            files=files,
            params=params,
            data=data,
            timeout=TIMEOUT,
        )
    except requests.exceptions.ConnectionError:
        print(f"\n  ⚠️  Không kết nối được {url} — backend có đang chạy không?")
        sys.exit(1)
    return resp


def section(title):
    w = 60
    print(f"\n{'═'*w}")
    print(f"  {title}")
    print(f"{'═'*w}")


def set_admin_role(email):
    """Dùng docker exec mongosh để promote user thành admin."""
    cmd = [
        "docker", "exec", "cleanfood_mongo",
        "mongosh",
        "--username", "admin",
        "--password", "changeme_strong_password",
        "--authenticationDatabase", "admin",
        "--eval",
        f"db.getSiblingDB('cleanfoodstore').users.updateOne({{email:'{email}'}},{{$set:{{role:'admin'}}}})"
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        if result.returncode == 0 and ("modifiedCount: 1" in result.stdout or "matchedCount: 1" in result.stdout):
            print(f"  ✅ Promoted {email} → admin")
            return True
        if result.returncode == 0:
            print(f"  ⚠️  Mongo ran OK nhưng không update: {result.stdout[:200]}")
            return False
        print(f"  ⚠️  Mongo output: {result.stdout[:200]} {result.stderr[:100]}")
        return False
    except Exception as e:
        print(f"  ⚠️  Không thể set admin qua docker: {e}")
        return False


def get_admin_mongo_pass():
    """Đọc MONGO_ROOT_PASS từ .env."""
    env = Path(__file__).parent.parent / ".env"
    if env.exists():
        for line in env.read_text(encoding="utf-8").splitlines():
            if line.startswith("MONGO_ROOT_PASS="):
                return line.split("=", 1)[1].strip()
    return "changeme_strong_password"


# ══════════════════════════════════════════════════════════════
# PHASE 0 — Health check
# ══════════════════════════════════════════════════════════════
def phase_health():
    section("PHASE 0 — Health Check")
    r = api("GET", "/health")
    record("Health", "Server health check", "GET", f"{BASE}/health", r)


# ══════════════════════════════════════════════════════════════
# PHASE 1 — Auth
# ══════════════════════════════════════════════════════════════
def phase_auth():
    section("PHASE 1 — Auth (Đăng ký / Đăng nhập / Thông tin)")

    # 1.1 Đăng ký admin
    r = api("POST", "/auth/register", json_body={"name": ADMIN_NAME, "email": ADMIN_EMAIL, "password": ADMIN_PASS})
    ok, _ = record("Auth", "Đăng ký admin", "POST", f"{BASE}/auth/register", r)

    # 1.2 Đăng ký user
    r = api("POST", "/auth/register", json_body={"name": USER_NAME, "email": USER_EMAIL, "password": USER_PASS})
    record("Auth", "Đăng ký user", "POST", f"{BASE}/auth/register", r)

    # 1.3 Đăng ký thiếu field → expect 400
    r = api("POST", "/auth/register", json_body={"email": "missing@test.com"})
    results.append(("Auth", "Đăng ký thiếu field (expect 400)", "POST", f"{BASE}/auth/register",
                    r.status_code, r.status_code == 400, ""))
    mark = "✅" if r.status_code == 400 else "❌"
    print(f"  {mark} [{r.status_code}] POST   /auth/register — Đăng ký thiếu field (expect 400)")

    # 1.4 Đăng ký email trùng → expect 409
    r = api("POST", "/auth/register", json_body={"name": "Dup", "email": ADMIN_EMAIL, "password": "123456"})
    results.append(("Auth", "Đăng ký email trùng (expect 409)", "POST", f"{BASE}/auth/register",
                    r.status_code, r.status_code == 409, ""))
    mark = "✅" if r.status_code == 409 else "❌"
    print(f"  {mark} [{r.status_code}] POST   /auth/register — Đăng ký email trùng (expect 409)")

    # 1.5 Promote admin role via mongo
    print("\n  → Promoting admin via mongosh...")
    mongo_pass = get_admin_mongo_pass()
    cmd = [
        "docker", "exec", "cleanfood_mongo", "mongosh",
        "--username", "admin", "--password", mongo_pass,
        "--authenticationDatabase", "admin",
        "--eval",
        f"db.getSiblingDB('cleanfoodstore').users.updateOne({{email:'{ADMIN_EMAIL}'}},{{$set:{{role:'admin'}}}})"
    ]
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        if out.returncode == 0 and ("modifiedCount: 1" in out.stdout or "matchedCount: 1" in out.stdout):
            print(f"  ✅ Role admin set thành công")
        elif out.returncode == 0:
            print(f"  ⚠️  Mongo ran nhưng không update được: {out.stdout[:200]}")
        else:
            print(f"  ⚠️  {out.stderr[:150]}")
    except Exception as e:
        print(f"  ⚠️  {e}")

    # 1.6 Login admin
    r = api("POST", "/auth/login", json_body={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    ok, _ = record("Auth", "Đăng nhập admin", "POST", f"{BASE}/auth/login", r)
    if ok:
        IDS["admin_token"] = r.json()["data"]["token"]
        IDS["admin_id"] = r.json()["data"]["user"]["_id"]

    # 1.7 Login user
    r = api("POST", "/auth/login", json_body={"email": USER_EMAIL, "password": USER_PASS})
    ok, _ = record("Auth", "Đăng nhập user", "POST", f"{BASE}/auth/login", r)
    if ok:
        IDS["user_token"] = r.json()["data"]["token"]
        IDS["user_id"] = r.json()["data"]["user"]["_id"]

    # 1.8 Login sai password → expect 401
    r = api("POST", "/auth/login", json_body={"email": ADMIN_EMAIL, "password": "wrongpass"})
    results.append(("Auth", "Đăng nhập sai mật khẩu (expect 401)", "POST", f"{BASE}/auth/login",
                    r.status_code, r.status_code == 401, ""))
    mark = "✅" if r.status_code == 401 else "❌"
    print(f"  {mark} [{r.status_code}] POST   /auth/login — Đăng nhập sai mật khẩu (expect 401)")

    # 1.9 GET /me (admin)
    r = api("GET", "/auth/me", token=IDS.get("admin_token"))
    record("Auth", "Lấy thông tin /me (admin)", "GET", f"{BASE}/auth/me", r)

    # 1.10 GET /me không có token → expect 401
    r = api("GET", "/auth/me")
    results.append(("Auth", "GET /me không token (expect 401)", "GET", f"{BASE}/auth/me",
                    r.status_code, r.status_code == 401, ""))
    mark = "✅" if r.status_code == 401 else "❌"
    print(f"  {mark} [{r.status_code}] GET    /auth/me — GET /me không token (expect 401)")


# ══════════════════════════════════════════════════════════════
# PHASE 2 — Users / Profile
# ══════════════════════════════════════════════════════════════
def phase_users():
    section("PHASE 2 — Users / Profile")
    tok = IDS.get("user_token")

    # 2.1 GET profile
    r = api("GET", "/users/profile", token=tok)
    record("Users", "Lấy profile user", "GET", f"{BASE}/users/profile", r)

    # 2.2 PUT profile
    r = api("PUT", "/users/profile", token=tok,
            json_body={"name": "Test User Updated", "phone": "0901234567"})
    record("Users", "Cập nhật profile", "PUT", f"{BASE}/users/profile", r)

    # 2.3 Profile không token → 401
    r = api("GET", "/users/profile")
    results.append(("Users", "Profile không token (expect 401)", "GET", f"{BASE}/users/profile",
                    r.status_code, r.status_code == 401, ""))
    mark = "✅" if r.status_code == 401 else "❌"
    print(f"  {mark} [{r.status_code}] GET    /users/profile — Profile không token (expect 401)")


# ══════════════════════════════════════════════════════════════
# PHASE 3 — Farms
# ══════════════════════════════════════════════════════════════
def phase_farms():
    section("PHASE 3 — Farms (Trang trại)")
    atk = IDS.get("admin_token")
    utk = IDS.get("user_token")

    # 3.1 GET all (public)
    r = api("GET", "/farms")
    record("Farms", "Lấy danh sách farms", "GET", f"{BASE}/farms", r)

    # 3.2 GET all với query params
    r = api("GET", "/farms", params={"page": 1, "limit": 5, "certificate": "VietGAP"})
    record("Farms", "Danh sách farms (filter VietGAP)", "GET", f"{BASE}/farms", r)

    # 3.3 POST create (admin)
    r = api("POST", "/farms", token=atk, json_body={
        "name": f"Farm Test {UNIQUE}",
        "location": "Đà Lạt, Lâm Đồng",
        "description": "Trang trại test tự động",
        "contact": "0123456789",
        "certificate": "VietGAP"
    })
    ok, _ = record("Farms", "Tạo farm mới (admin)", "POST", f"{BASE}/farms", r)
    if ok:
        IDS["farm_id"] = r.json()["data"]["farm"]["_id"]

    # 3.4 GET by ID
    if IDS.get("farm_id"):
        r = api("GET", f"/farms/{IDS['farm_id']}")
        record("Farms", "Lấy chi tiết farm theo ID", "GET", f"{BASE}/farms/:id", r)

    # 3.5 PUT update (admin)
    if IDS.get("farm_id"):
        r = api("PUT", f"/farms/{IDS['farm_id']}", token=atk,
                json_body={"description": "Đã cập nhật từ test"})
        record("Farms", "Cập nhật farm (admin)", "PUT", f"{BASE}/farms/:id", r)

    # 3.6 POST farm (user) → expect 403
    r = api("POST", "/farms", token=utk, json_body={
        "name": "Farm Blocked", "location": "HN", "contact": "0111", "certificate": "Organic"
    })
    results.append(("Farms", "Tạo farm bằng user (expect 403)", "POST", f"{BASE}/farms",
                    r.status_code, r.status_code == 403, ""))
    mark = "✅" if r.status_code == 403 else "❌"
    print(f"  {mark} [{r.status_code}] POST   /farms — Tạo farm bằng user (expect 403)")

    # 3.7 GET farm không tồn tại → expect 404
    r = api("GET", "/farms/000000000000000000000000")
    results.append(("Farms", "Farm không tồn tại (expect 404)", "GET", f"{BASE}/farms/:id",
                    r.status_code, r.status_code == 404, ""))
    mark = "✅" if r.status_code == 404 else "❌"
    print(f"  {mark} [{r.status_code}] GET    /farms/:id — Farm không tồn tại (expect 404)")


# ══════════════════════════════════════════════════════════════
# PHASE 4 — Categories
# ══════════════════════════════════════════════════════════════
def phase_categories():
    section("PHASE 4 — Categories (Danh mục)")
    atk = IDS.get("admin_token")
    utk = IDS.get("user_token")

    # 4.1 GET all
    r = api("GET", "/categories")
    record("Categories", "Lấy danh sách categories", "GET", f"{BASE}/categories", r)

    # 4.2 POST create
    r = api("POST", "/categories", token=atk, json_body={
        "name": f"Rau củ Test {UNIQUE}",
        "description": "Danh mục test tự động"
    })
    ok, _ = record("Categories", "Tạo category mới", "POST", f"{BASE}/categories", r)
    if ok:
        IDS["cat_id"] = r.json()["data"]["category"]["_id"]

    # 4.3 GET by ID
    if IDS.get("cat_id"):
        r = api("GET", f"/categories/{IDS['cat_id']}")
        record("Categories", "Lấy chi tiết category", "GET", f"{BASE}/categories/:id", r)

    # 4.4 PUT update
    if IDS.get("cat_id"):
        r = api("PUT", f"/categories/{IDS['cat_id']}", token=atk,
                json_body={"description": "Mô tả đã sửa"})
        record("Categories", "Cập nhật category", "PUT", f"{BASE}/categories/:id", r)

    # 4.5 Tạo category không role → 403
    r = api("POST", "/categories", token=utk, json_body={"name": "Blocked"})
    results.append(("Categories", "Tạo category bằng user (expect 403)", "POST",
                    f"{BASE}/categories", r.status_code, r.status_code == 403, ""))
    mark = "✅" if r.status_code == 403 else "❌"
    print(f"  {mark} [{r.status_code}] POST   /categories — Tạo bằng user (expect 403)")


# ══════════════════════════════════════════════════════════════
# PHASE 5 — Products
# ══════════════════════════════════════════════════════════════
def phase_products():
    section("PHASE 5 — Products (Sản phẩm)")
    atk = IDS.get("admin_token")

    today = datetime.now().strftime("%Y-%m-%d")
    future = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")

    # 5.1 GET all (public)
    r = api("GET", "/products")
    record("Products", "Lấy danh sách sản phẩm", "GET", f"{BASE}/products", r)

    # 5.2 Search
    r = api("GET", "/products/search", params={"name": "test", "minPrice": 0})
    record("Products", "Tìm kiếm sản phẩm", "GET", f"{BASE}/products/search", r)

    # 5.3 POST create (multipart)
    farm_id = IDS.get("farm_id")
    cat_id  = IDS.get("cat_id")

    if not farm_id or not cat_id:
        print("  ⏭️  Bỏ qua tạo sản phẩm (thiếu farm/category)")
    else:
        multipart_data = {
            "name": f"Chuối Test {UNIQUE}",
            "description": "Sản phẩm test tự động",
            "price": "25000",
            "unit": "kg",
            "category": cat_id,
            "farm": farm_id,
            "standards": "VietGAP",
            "harvestDate": today,
            "expiryDate": future,
        }
        files = None
        if FAKE_IMAGE_PATH.exists():
            files = {"images": (FAKE_IMAGE_PATH.name, FAKE_IMAGE_PATH.read_bytes(), "image/jpeg")}

        # Multipart: không dùng json_body, dùng data=
        url = f"{BASE}/products"
        headers = {"Authorization": f"Bearer {atk}"}
        try:
            r = requests.post(url, headers=headers, data=multipart_data, files=files, timeout=TIMEOUT)
        except Exception as e:
            print(f"  ❌ POST /products lỗi: {e}")
            return

        ok, _ = record("Products", "Tạo sản phẩm mới (admin)", "POST", f"{BASE}/products", r)
        if ok:
            IDS["product_id"] = r.json()["data"]["product"]["_id"]

    # 5.4 GET by ID
    if IDS.get("product_id"):
        r = api("GET", f"/products/{IDS['product_id']}")
        record("Products", "Lấy chi tiết sản phẩm", "GET", f"{BASE}/products/:id", r)

    # 5.5 GET theo query params
    r = api("GET", "/products", params={"page": 1, "limit": 3})
    record("Products", "Danh sách sản phẩm (phân trang)", "GET", f"{BASE}/products", r)

    # 5.6 PUT update (multipart)
    if IDS.get("product_id"):
        url = f"{BASE}/products/{IDS['product_id']}"
        headers = {"Authorization": f"Bearer {atk}"}
        try:
            r = requests.put(url, headers=headers, data={"price": "30000"}, timeout=TIMEOUT)
        except Exception as e:
            r = None
        if r:
            record("Products", "Cập nhật sản phẩm (admin)", "PUT", f"{BASE}/products/:id", r)

    # 5.7 Sản phẩm không tồn tại → 404
    r = api("GET", "/products/000000000000000000000000")
    results.append(("Products", "Sản phẩm không tồn tại (expect 404)", "GET",
                    f"{BASE}/products/:id", r.status_code, r.status_code == 404, ""))
    mark = "✅" if r.status_code == 404 else "❌"
    print(f"  {mark} [{r.status_code}] GET    /products/:id — Không tồn tại (expect 404)")


# ══════════════════════════════════════════════════════════════
# PHASE 6 — Batches (Lô hàng)
# ══════════════════════════════════════════════════════════════
def phase_batches():
    section("PHASE 6 — Batches (Lô hàng)")
    atk = IDS.get("admin_token")
    pid = IDS.get("product_id")

    if not pid:
        print("  ⏭️  Bỏ qua batch tests (không có product_id)")
        return

    mfg = (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d")
    exp = (datetime.now() + timedelta(days=60)).strftime("%Y-%m-%d")

    # 6.1 POST create batch
    r = api("POST", "/batches", token=atk, json_body={
        "product": pid,
        "batchNumber": f"BATCH-{UNIQUE}",
        "quantity": 100,
        "originalQuantity": 100,
        "manufacturingDate": mfg,
        "expiryDate": exp,
    })
    ok, _ = record("Batches", "Tạo lô hàng mới", "POST", f"{BASE}/batches", r)
    if ok:
        IDS["batch_id"] = r.json()["data"]["batch"]["_id"]

    # 6.2 GET all
    r = api("GET", "/batches", token=atk)
    record("Batches", "Danh sách lô hàng", "GET", f"{BASE}/batches", r)

    # 6.3 GET by ID
    if IDS.get("batch_id"):
        r = api("GET", f"/batches/{IDS['batch_id']}", token=atk)
        record("Batches", "Chi tiết lô hàng", "GET", f"{BASE}/batches/:id", r)

    # 6.4 GET inventory-report
    r = api("GET", "/batches/inventory-report", token=atk)
    record("Batches", "Báo cáo tồn kho tổng hợp", "GET", f"{BASE}/batches/inventory-report", r)

    # 6.5 GET expiring
    r = api("GET", "/batches/expiring", token=atk, params={"days": 90})
    record("Batches", "Lô sắp hết hạn", "GET", f"{BASE}/batches/expiring", r)

    # 6.6 GET stock by productId
    r = api("GET", f"/batches/stock/{pid}", token=atk)
    record("Batches", "Tồn kho theo sản phẩm", "GET", f"{BASE}/batches/stock/:productId", r)

    # 6.7 PUT update
    if IDS.get("batch_id"):
        r = api("PUT", f"/batches/{IDS['batch_id']}", token=atk,
                json_body={"quantity": 99})
        record("Batches", "Cập nhật lô hàng", "PUT", f"{BASE}/batches/:id", r)

    # 6.8 Tạo batch số lô trùng → 400
    r = api("POST", "/batches", token=atk, json_body={
        "product": pid,
        "batchNumber": f"BATCH-{UNIQUE}",   # trùng
        "quantity": 10,
        "originalQuantity": 10,
        "manufacturingDate": mfg,
        "expiryDate": exp,
    })
    results.append(("Batches", "Batch số lô trùng (expect 400)", "POST", f"{BASE}/batches",
                    r.status_code, r.status_code == 400, ""))
    mark = "✅" if r.status_code == 400 else "❌"
    print(f"  {mark} [{r.status_code}] POST   /batches — Số lô trùng (expect 400)")


# ══════════════════════════════════════════════════════════════
# PHASE 7 — Inventory
# ══════════════════════════════════════════════════════════════
def phase_inventory():
    section("PHASE 7 — Inventory (Cảnh báo kho)")
    atk = IDS.get("admin_token")

    # 7.1 GET alerts
    r = api("GET", "/inventory/alerts", token=atk, params={"days": 30})
    record("Inventory", "Cảnh báo tồn kho", "GET", f"{BASE}/inventory/alerts", r)

    # 7.2 Không token → 401
    r = api("GET", "/inventory/alerts")
    results.append(("Inventory", "Alerts không token (expect 401)", "GET",
                    f"{BASE}/inventory/alerts", r.status_code, r.status_code == 401, ""))
    mark = "✅" if r.status_code == 401 else "❌"
    print(f"  {mark} [{r.status_code}] GET    /inventory/alerts — Không token (expect 401)")


# ══════════════════════════════════════════════════════════════
# PHASE 8 — Cart
# ══════════════════════════════════════════════════════════════
def phase_cart():
    section("PHASE 8 — Cart (Giỏ hàng)")
    utk = IDS.get("user_token")
    pid = IDS.get("product_id")

    # 8.1 GET cart (empty)
    r = api("GET", "/cart", token=utk)
    record("Cart", "Lấy giỏ hàng (mới đăng ký)", "GET", f"{BASE}/cart", r)

    if pid:
        # 8.2 POST add to cart
        r = api("POST", "/cart", token=utk, json_body={"productId": pid, "quantity": 2})
        record("Cart", "Thêm sản phẩm vào giỏ", "POST", f"{BASE}/cart", r)

        # 8.3 GET cart (có hàng)
        r = api("GET", "/cart", token=utk)
        record("Cart", "Lấy giỏ hàng (đã có sản phẩm)", "GET", f"{BASE}/cart", r)

        # 8.4 PUT update quantity
        r = api("PUT", f"/cart/{pid}", token=utk, json_body={"quantity": 3})
        record("Cart", "Cập nhật số lượng giỏ hàng", "PUT", f"{BASE}/cart/:productId", r)

        # 8.5 DELETE item
        r = api("DELETE", f"/cart/{pid}", token=utk)
        record("Cart", "Xóa sản phẩm khỏi giỏ", "DELETE", f"{BASE}/cart/:productId", r)

        # 8.6 Add lại để test clear
        api("POST", "/cart", token=utk, json_body={"productId": pid, "quantity": 1})

        # 8.7 DELETE clear cart
        r = api("DELETE", "/cart", token=utk)
        record("Cart", "Xóa toàn bộ giỏ hàng", "DELETE", f"{BASE}/cart", r)
    else:
        print("  ⏭️  Bỏ qua cart item tests (không có product_id)")

    # 8.8 Cart không token → 401
    r = api("GET", "/cart")
    results.append(("Cart", "Cart không token (expect 401)", "GET", f"{BASE}/cart",
                    r.status_code, r.status_code == 401, ""))
    mark = "✅" if r.status_code == 401 else "❌"
    print(f"  {mark} [{r.status_code}] GET    /cart — Không token (expect 401)")


# ══════════════════════════════════════════════════════════════
# PHASE 9 — Discounts
# ══════════════════════════════════════════════════════════════
def phase_discounts():
    section("PHASE 9 — Discounts (Mã giảm giá)")
    atk = IDS.get("admin_token")
    utk = IDS.get("user_token")

    discount_code = f"TESTAUTO{UNIQUE[:6].upper()}"
    exp_date = (datetime.now() + timedelta(days=30)).isoformat()

    # 9.1 GET all (admin)
    r = api("GET", "/discounts", token=atk)
    record("Discounts", "Danh sách mã giảm giá (admin)", "GET", f"{BASE}/discounts", r)

    # 9.2 POST create
    r = api("POST", "/discounts", token=atk, json_body={
        "code": discount_code,
        "type": "percentage",
        "value": 10,
        "minOrderTotal": 50000,
        "maxUsage": 100,
        "expiryDate": exp_date,
    })
    ok, _ = record("Discounts", "Tạo mã giảm giá", "POST", f"{BASE}/discounts", r)
    if ok:
        data = r.json().get("data", {})
        IDS["discount_id"]   = data.get("_id") or data.get("discount", {}).get("_id", "")
        IDS["discount_code"] = discount_code

    # 9.3 GET by ID
    if IDS.get("discount_id"):
        r = api("GET", f"/discounts/{IDS['discount_id']}", token=atk)
        record("Discounts", "Chi tiết mã giảm giá", "GET", f"{BASE}/discounts/:id", r)

    # 9.4 PUT update
    if IDS.get("discount_id"):
        r = api("PUT", f"/discounts/{IDS['discount_id']}", token=atk,
                json_body={"value": 15})
        record("Discounts", "Cập nhật mã giảm giá", "PUT", f"{BASE}/discounts/:id", r)

    # 9.5 Validate discount (user)
    if IDS.get("discount_code"):
        r = api("POST", "/discounts/validate", token=utk,
                json_body={"code": IDS["discount_code"], "orderTotal": 200000})
        record("Discounts", "Validate mã giảm giá (user)", "POST", f"{BASE}/discounts/validate", r)

    # 9.6 Validate mã sai → 404
    r = api("POST", "/discounts/validate", token=utk,
            json_body={"code": "WRONGCODE999", "orderTotal": 200000})
    results.append(("Discounts", "Validate mã sai (expect 4xx)", "POST",
                    f"{BASE}/discounts/validate", r.status_code, r.status_code >= 400, ""))
    mark = "✅" if r.status_code >= 400 else "❌"
    print(f"  {mark} [{r.status_code}] POST   /discounts/validate — Mã sai (expect 4xx)")


# ══════════════════════════════════════════════════════════════
# PHASE 10 — Orders
# ══════════════════════════════════════════════════════════════
def phase_orders():
    section("PHASE 10 — Orders (Đặt hàng)")
    atk = IDS.get("admin_token")
    utk = IDS.get("user_token")
    pid = IDS.get("product_id")

    # 10.1 VNPay IPN (public — không có data → trả lỗi nhưng phải reach server)
    r = api("GET", "/orders/vnpay-ipn", params={"vnp_ResponseCode": "99"})
    results.append(("Orders", "VNPay IPN endpoint (public)", "GET",
                    f"{BASE}/orders/vnpay-ipn", r.status_code, r.status_code < 500, ""))
    mark = "✅" if r.status_code < 500 else "❌"
    print(f"  {mark} [{r.status_code}] GET    /orders/vnpay-ipn — VNPay IPN endpoint")

    # 10.2 VNPay Return (public)
    r = api("GET", "/orders/vnpay-return", params={"vnp_ResponseCode": "99"})
    results.append(("Orders", "VNPay Return endpoint (public)", "GET",
                    f"{BASE}/orders/vnpay-return", r.status_code, r.status_code < 500, ""))
    mark = "✅" if r.status_code < 500 else "❌"
    print(f"  {mark} [{r.status_code}] GET    /orders/vnpay-return — VNPay Return endpoint")

    if pid:
        # Thêm hàng vào giỏ trước khi checkout
        api("POST", "/cart", token=utk, json_body={"productId": pid, "quantity": 1})

        # 10.3 POST checkout COD
        r = api("POST", "/orders/checkout", token=utk, json_body={
            "shippingAddress": {
                "fullName": "Test User",
                "phone": "0901234567",
                "address": "123 Đường Test",
                "city": "Hồ Chí Minh"
            },
            "paymentMethod": "COD",
        })
        ok, _ = record("Orders", "Đặt hàng COD", "POST", f"{BASE}/orders/checkout", r)
        if ok:
            data = r.json().get("data", {})
            IDS["order_id"] = data.get("order", {}).get("_id", "") or data.get("_id", "")

        # 10.4 POST checkout VNPay (chỉ lấy URL, không thanh toán thật)
        api("POST", "/cart", token=utk, json_body={"productId": pid, "quantity": 1})
        r = api("POST", "/orders/checkout-vnpay", token=utk, json_body={
            "shippingAddress": {
                "fullName": "Test User",
                "phone": "0901234567",
                "address": "456 Đường VNPay",
                "city": "Hà Nội"
            },
            "paymentMethod": "VNPay",
        })
        ok, _ = record("Orders", "Checkout VNPay (lấy URL)", "POST", f"{BASE}/orders/checkout-vnpay", r)
        if ok:
            data = r.json().get("data", {})
            vnpay_order_id = data.get("order", {}).get("_id", "")
            IDS["vnpay_order_id"] = vnpay_order_id   # keep separate for cancel test
            if vnpay_order_id and not IDS.get("order_id"):
                IDS["order_id"] = vnpay_order_id
    else:
        print("  ⏭️  Bỏ qua checkout (không có product_id)")

    # 10.5 GET my orders (user)
    r = api("GET", "/orders", token=utk)
    record("Orders", "Danh sách đơn hàng của user", "GET", f"{BASE}/orders", r)

    # 10.6 GET admin all orders
    r = api("GET", "/orders/admin/all", token=atk)
    record("Orders", "Tất cả đơn hàng (admin)", "GET", f"{BASE}/orders/admin/all", r)

    # 10.7 GET order by ID
    if IDS.get("order_id"):
        r = api("GET", f"/orders/{IDS['order_id']}", token=utk)
        record("Orders", "Chi tiết đơn hàng", "GET", f"{BASE}/orders/:id", r)

    # 10.8 PATCH status (admin): Pending → Processing
    if IDS.get("order_id"):
        r = api("PATCH", f"/orders/{IDS['order_id']}/status", token=atk,
                json_body={"status": "Processing"})
        record("Orders", "Cập nhật trạng thái đơn (admin)", "PATCH", f"{BASE}/orders/:id/status", r)

    # 10.9 PATCH cancel — dùng VNPay order (vẫn ở Pending vì chưa thanh toán)
    cancel_id = IDS.get("vnpay_order_id") or IDS.get("order_id")
    if cancel_id and cancel_id != IDS.get("order_id"):
        r = api("PATCH", f"/orders/{cancel_id}/cancel", token=utk)
        record("Orders", "Hủy đơn hàng (VNPay-Pending)", "PATCH", f"{BASE}/orders/:id/cancel", r)
    elif IDS.get("order_id"):
        # Fallback: admin cancel via status endpoint
        r = api("PATCH", f"/orders/{IDS['order_id']}/status", token=atk,
                json_body={"status": "Cancelled"})
        record("Orders", "Hủy đơn hàng (admin-status)", "PATCH", f"{BASE}/orders/:id/cancel", r)

    # 10.10 GET orders không token → 401
    r = api("GET", "/orders")
    results.append(("Orders", "Đơn hàng không token (expect 401)", "GET", f"{BASE}/orders",
                    r.status_code, r.status_code == 401, ""))
    mark = "✅" if r.status_code == 401 else "❌"
    print(f"  {mark} [{r.status_code}] GET    /orders — Không token (expect 401)")


# ══════════════════════════════════════════════════════════════
# PHASE 11 — Reviews
# ══════════════════════════════════════════════════════════════
def phase_reviews():
    section("PHASE 11 — Reviews (Đánh giá sản phẩm)")
    utk = IDS.get("user_token")
    pid = IDS.get("product_id")

    # 11.1 GET reviews by product (public)
    if pid:
        r = api("GET", f"/reviews/product/{pid}")
        record("Reviews", "Lấy reviews theo sản phẩm", "GET", f"{BASE}/reviews/product/:id", r)

    # 11.2 GET reviews — product không tồn tại → service trả 404 (validate product exists)
    r = api("GET", "/reviews/product/000000000000000000000000")
    results.append(("Reviews", "Reviews sản phẩm không tồn tại (expect 404)", "GET",
                    f"{BASE}/reviews/product/:id", r.status_code, r.status_code == 404, ""))
    mark = "✅" if r.status_code == 404 else "❌"
    print(f"  {mark} [{r.status_code}] GET    /reviews/product/:id — Product không tồn tại (expect 404)")

    if pid:
        # 11.3 POST tạo review
        r = api("POST", "/reviews", token=utk, json_body={
            "productId": pid,
            "rating": 5,
            "comment": "Sản phẩm rất tươi ngon, giao hàng nhanh!"
        })
        ok, _ = record("Reviews", "Tạo đánh giá sản phẩm", "POST", f"{BASE}/reviews", r)
        if ok:
            rv_data = r.json().get("data", {})
            IDS["review_id"] = rv_data.get("review", {}).get("_id", "") or rv_data.get("_id", "")

        # 11.4 PUT update review
        if IDS.get("review_id"):
            r = api("PUT", f"/reviews/{IDS['review_id']}", token=utk,
                    json_body={"rating": 4, "comment": "Thật ra 4 sao thôi"})
            record("Reviews", "Cập nhật đánh giá", "PUT", f"{BASE}/reviews/:id", r)

        # 11.5 Tạo review thiếu comment → 400
        r = api("POST", "/reviews", token=utk, json_body={"productId": pid, "rating": 3, "comment": "x"})
        results.append(("Reviews", "Review comment quá ngắn (expect 400)", "POST",
                        f"{BASE}/reviews", r.status_code, r.status_code == 400, ""))
        mark = "✅" if r.status_code == 400 else "❌"
        print(f"  {mark} [{r.status_code}] POST   /reviews — Comment quá ngắn (expect 400)")

    # 11.6 Review không token → 401
    r = api("POST", "/reviews", json_body={"productId": "x", "rating": 5, "comment": "ok"})
    results.append(("Reviews", "Review không token (expect 401)", "POST", f"{BASE}/reviews",
                    r.status_code, r.status_code == 401, ""))
    mark = "✅" if r.status_code == 401 else "❌"
    print(f"  {mark} [{r.status_code}] POST   /reviews — Không token (expect 401)")


# ══════════════════════════════════════════════════════════════
# PHASE 12 — Stats
# ══════════════════════════════════════════════════════════════
def phase_stats():
    section("PHASE 12 — Stats (Thống kê admin)")
    atk = IDS.get("admin_token")
    utk = IDS.get("user_token")

    # 12.1 Revenue monthly
    r = api("GET", "/stats/revenue", token=atk, params={"period": "monthly"})
    record("Stats", "Doanh thu theo tháng", "GET", f"{BASE}/stats/revenue", r)

    # 12.2 Revenue daily
    r = api("GET", "/stats/revenue", token=atk, params={"period": "daily"})
    record("Stats", "Doanh thu theo ngày", "GET", f"{BASE}/stats/revenue", r)

    # 12.3 Top sellers
    r = api("GET", "/stats/top-sellers", token=atk, params={"limit": 5})
    record("Stats", "Top sản phẩm bán chạy", "GET", f"{BASE}/stats/top-sellers", r)

    # 12.4 Expiring soon
    r = api("GET", "/stats/expiring-soon", token=atk, params={"days": 7})
    record("Stats", "Lô sắp hết hạn (stats)", "GET", f"{BASE}/stats/expiring-soon", r)

    # 12.5 Stats bằng user → 403
    r = api("GET", "/stats/revenue", token=utk)
    results.append(("Stats", "Stats bằng user (expect 403)", "GET", f"{BASE}/stats/revenue",
                    r.status_code, r.status_code == 403, ""))
    mark = "✅" if r.status_code == 403 else "❌"
    print(f"  {mark} [{r.status_code}] GET    /stats/revenue — User thường (expect 403)")


# ══════════════════════════════════════════════════════════════
# PHASE 13 — Cleanup (Xóa dữ liệu test)
# ══════════════════════════════════════════════════════════════
def phase_cleanup():
    section("PHASE 13 — Cleanup (Xóa dữ liệu test)")
    atk = IDS.get("admin_token")

    # Xóa review
    if IDS.get("review_id"):
        r = api("DELETE", f"/reviews/{IDS['review_id']}", token=IDS.get("user_token"))
        ok, _ = record("Cleanup", "Xóa review test", "DELETE", f"{BASE}/reviews/:id", r)

    # Xóa discount
    if IDS.get("discount_id"):
        r = api("DELETE", f"/discounts/{IDS['discount_id']}", token=atk)
        ok, _ = record("Cleanup", "Xóa discount test", "DELETE", f"{BASE}/discounts/:id", r)

    # Xóa batch
    if IDS.get("batch_id"):
        r = api("DELETE", f"/batches/{IDS['batch_id']}", token=atk)
        ok, _ = record("Cleanup", "Xóa batch test", "DELETE", f"{BASE}/batches/:id", r)

    # Xóa product
    if IDS.get("product_id"):
        r = api("DELETE", f"/products/{IDS['product_id']}", token=atk)
        ok, _ = record("Cleanup", "Xóa product test", "DELETE", f"{BASE}/products/:id", r)

    # Xóa category
    if IDS.get("cat_id"):
        r = api("DELETE", f"/categories/{IDS['cat_id']}", token=atk)
        ok, _ = record("Cleanup", "Xóa category test", "DELETE", f"{BASE}/categories/:id", r)

    # Xóa farm
    if IDS.get("farm_id"):
        r = api("DELETE", f"/farms/{IDS['farm_id']}", token=atk)
        ok, _ = record("Cleanup", "Xóa farm test", "DELETE", f"{BASE}/farms/:id", r)


# ══════════════════════════════════════════════════════════════
# REPORT
# ══════════════════════════════════════════════════════════════
def print_report():
    section("📊 BÁO CÁO KẾT QUẢ TOÀN BỘ API")

    total = len(results)
    passed = sum(1 for *_, p, _ in results if p)
    failed = total - passed

    # Group by category
    groups = {}
    for group, name, method, url, status, ok, note in results:
        groups.setdefault(group, []).append((name, method, url, status, ok, note))

    print()
    for grp, items in groups.items():
        grp_ok = sum(1 for *_, ok, _ in items if ok)
        grp_total = len(items)
        bar = "✅" if grp_ok == grp_total else ("⚠️ " if grp_ok > 0 else "❌")
        print(f"  {bar} {grp:20s} {grp_ok}/{grp_total}")
        for name, method, url, status, ok, note in items:
            mark = "  ✅" if ok else "  ❌"
            short_url = url.replace(BASE, "")
            print(f"      {mark} [{status:3}] {method:6} {short_url:40} {name}")
        print()

    w = 60
    print("═" * w)
    pct = round(passed / total * 100) if total else 0
    print(f"  TỔNG KẾT: {passed}/{total} PASSED  ({pct}%)")
    if failed:
        print(f"  FAILED  : {failed} endpoint(s)")
    print("═" * w)
    print(f"\n  ⏱  Chạy lúc: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  🌐  Backend : {BASE.replace('/api','')}")
    print(f"  🔑  Admin   : {ADMIN_EMAIL}")
    print(f"  👤  User    : {USER_EMAIL}")

    # Save JSON report
    report_path = Path(__file__).parent / "api_test_report.json"
    report_path.write_text(json.dumps([
        {"group": g, "name": n, "method": m, "url": u, "status": s, "passed": p, "note": no}
        for g, n, m, u, s, p, no in results
    ], ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n  📄  Báo cáo JSON: {report_path}")


# ══════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print("\n" + "═" * 60)
    print("  🚀 CLEAN FOOD STORE — API FULL TEST")
    print(f"  Backend: {BASE}")
    print("═" * 60)

    phase_health()
    phase_auth()
    phase_users()
    phase_farms()
    phase_categories()
    phase_products()
    phase_batches()
    phase_inventory()
    phase_cart()
    phase_discounts()
    phase_orders()
    phase_reviews()
    phase_stats()
    phase_cleanup()

    print_report()
    total = len(results)
    passed = sum(1 for *_, p, _ in results if p)
    sys.exit(0 if passed == total else 1)
