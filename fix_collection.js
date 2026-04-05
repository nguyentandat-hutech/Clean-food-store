/**
 * fix_collection.js — Restructure Postman collection for correct e2e test flow
 *
 * Fixes:
 * 1. Move Delete Farm/Category/Product/Batch to Cleanup folder (after Wishlist)
 *    so their respective resource IDs remain valid for downstream tests
 * 2. Add "Add To Cart" before Checkout COD (cart may be empty after Cart tests)
 * 3. Add "Add To Cart" before Checkout VNPay (COD clears cart)
 * 4. Reorder Orders: Cancel Order (uses orderId=COD) BEFORE Update Status
 *    because cancelOrder only allows Pending; Update Status should use vnpayOrderId
 * 5. Fix Update Order Status URL to use {{vnpayOrderId}}
 */

const fs = require('fs');
const { v4: uuidv4 } = require('crypto').randomUUID ? { v4: () => require('crypto').randomUUID() } : { v4: () => 'xxxx-xxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16)) };
const uuid = () => require('crypto').randomUUID();

const collectionPath = './Clean-Food-Store.postman_collection.json';
// The backend copy has the full collection including Wishlist folder
// Use it as authoritative source
const backendCollectionPath = './backend/Clean-Food-Store.postman_collection.json';
const c = JSON.parse(fs.readFileSync(backendCollectionPath, 'utf8'));

// ── Helper ─────────────────────────────────────────────────────────────────
function makeItem(name, method, url, body, testScript, preRequestScript) {
    const item = {
        name,
        event: [],
        request: {
            method,
            header: [],
            url: {
                raw: url,
                host: [url.split('/')[2]],
                path: url.replace(/^https?:\/\/[^/]+\//, '').split('?')[0].split('/'),
            },
        },
    };
    if (typeof url === 'string' && url.includes('?')) {
        item.request.url.query = url.split('?')[1].split('&').map(p => {
            const [key, value] = p.split('=');
            return { key, value };
        });
    }
    if (body) {
        item.request.body = { mode: 'raw', raw: JSON.stringify(body, null, 2), options: { raw: { language: 'json' } } };
        item.request.header = [{ key: 'Content-Type', value: 'application/json' }];
    }
    if (testScript) {
        item.event.push({ listen: 'test', script: { type: 'text/javascript', exec: testScript.split('\n') } });
    }
    if (preRequestScript) {
        item.event.push({ listen: 'prerequest', script: { type: 'text/javascript', exec: preRequestScript.split('\n') } });
    }
    return item;
}

// ── 1. Extract delete requests from their folders ───────────────────────────
const farmsFolder = c.item[3];
const categoriesFolder = c.item[4];
const productsFolder = c.item[5];
const batchesFolder = c.item[6];

// Find and extract delete items
const deleteFarmIdx = farmsFolder.item.findIndex(r => r.name === 'Delete Farm (Admin)');
const deleteCategoryIdx = categoriesFolder.item.findIndex(r => r.name === 'Delete Category (Admin)');
const deleteProductIdx = productsFolder.item.findIndex(r => r.name === 'Delete Product (Admin)');
const deleteBatchIdx = batchesFolder.item.findIndex(r => r.name === 'Delete Batch (Admin)');

const deleteFarm = farmsFolder.item.splice(deleteFarmIdx, 1)[0];
const deleteCategory = categoriesFolder.item.splice(deleteCategoryIdx, 1)[0];
const deleteProduct = productsFolder.item.splice(deleteProductIdx, 1)[0];
const deleteBatch = batchesFolder.item.splice(deleteBatchIdx, 1)[0];

console.log('Removed from Farms:', deleteFarm.name);
console.log('Removed from Categories:', deleteCategory.name);
console.log('Removed from Products:', deleteProduct.name);
console.log('Removed from Batches:', deleteBatch.name);

// ── 2. Add To Cart requests for Orders folder ───────────────────────────────
// Clone from Cart folder's existing Add To Cart request for proper URL format
const cartFolder = c.item[8];
const existingAddToCart = cartFolder.item[0];

function cloneAddToCart(newName, testScript) {
    const clone = JSON.parse(JSON.stringify(existingAddToCart));
    clone.name = newName;
    // Keep same body (productId, quantity: 3)
    // Replace test script
    clone.event = [{
        listen: 'test',
        script: {
            type: 'text/javascript',
            exec: testScript.split('\n'),
        },
    }];
    return clone;
}

const addToCartItem = cloneAddToCart(
    'Add To Cart (COD Setup)',
    `pm.test('Add to cart for COD setup (200 or 201)', () => {
    pm.expect(pm.response.code).to.be.oneOf([200, 201]);
});`
);

const addToCartVNPayItem = cloneAddToCart(
    'Add To Cart (VNPay Setup)',
    `pm.test('Add to cart for VNPay setup (200 or 201)', () => {
    pm.expect(pm.response.code).to.be.oneOf([200, 201]);
});`
);

// ── 3. Restructure the Orders folder ───────────────────────────────────────
const ordersFolder = c.item[9];
const ordersItems = ordersFolder.item;

// Current order indexes (before our changes):
// 0 Checkout COD
// 1 Checkout VNPay
// 2 Get My Orders
// 3 Get Order By ID
// 4 Get All Orders (Admin)
// 5 Update Order Status (Admin) ← needs to use vnpayOrderId
// 6 Cancel Order
// 7 Hủy Đơn Hàng Đã Hủy (Negative)
// 8 VNPay IPN
// 9 VNPay Return
// 10 Checkout VNPay — Giỏ Hàng Trống (Negative)
// 11 Get My Orders — No Token (Negative)

const [checkoutCOD, checkoutVNPay, getMyOrders, getOrderById,
    getAllOrders, updateOrderStatus, cancelOrder, cancelCancelled,
    vnpayIPN, vnpayReturn, checkoutVNPayEmpty, getMyOrdersNoToken] = ordersItems;

// Fix Update Order Status to use vnpayOrderId
if (updateOrderStatus.request.url.raw) {
    updateOrderStatus.request.url.raw = updateOrderStatus.request.url.raw.replace('{{orderId}}', '{{vnpayOrderId}}');
    // Fix path array directly (not from raw, to avoid {{baseUrl}} being kept as path segment)
    if (updateOrderStatus.request.url.path) {
        updateOrderStatus.request.url.path = updateOrderStatus.request.url.path.map(
            p => p === '{{orderId}}' ? '{{vnpayOrderId}}' : p
        );
    }
}
// Update assertions too
if (updateOrderStatus.event) {
    updateOrderStatus.event.forEach(evt => {
        if (evt.listen === 'test' && evt.script) {
            evt.script.exec = evt.script.exec.map(line =>
                line.replace(/orderId/g, 'vnpayOrderId').replace(/\{\{orderId\}\}/g, '{{vnpayOrderId}}')
            );
        }
    });
}

// Fix Cancel Order test: controller returns order directly in data (not json.data.order)
// successResponse(res, 200, ..., order) → json.data IS the order
if (cancelOrder.event) {
    cancelOrder.event.forEach(evt => {
        if (evt.listen === 'test' && evt.script) {
            evt.script.exec = evt.script.exec.map(line =>
                line.replace(/json\.data\.order\.status/g, 'json.data.status')
            );
        }
    });
}

// Fix Checkout COD test: controller returns order directly in data (not json.data.order)
// successResponse(res, 201, ..., order) → json.data IS the order, not json.data.order
if (checkoutCOD.event) {
    checkoutCOD.event.forEach(evt => {
        if (evt.listen === 'test' && evt.script) {
            evt.script.exec = evt.script.exec.map(line =>
                // Full condition must be replaced BEFORE individual field replacements
                line
                    .replace(
                        'json.data && json.data.order && json.data.order._id',
                        'json.data && json.data._id'
                    )
                    .replace(/json\.data\.order\._id/g, 'json.data._id')
                    .replace(/json\.data\.order\.paymentMethod/g, 'json.data.paymentMethod')
            );
        }
    });
}

// New order:
// [0] Add To Cart (COD setup)
// [1] Checkout COD -> saves orderId
// [2] Add To Cart (VNPay setup, since COD empties cart)
// [3] Checkout VNPay -> saves vnpayOrderId
// [4] Get My Orders
// [5] Get Order By ID (uses orderId = COD)
// [6] Get All Orders (Admin)
// [7] Update Order Status (uses vnpayOrderId = VNPay, Pending -> Processing)
// [8] Cancel Order (uses orderId = COD, Pending -> Cancelled)
// [9] Hủy Đơn Hàng Đã Hủy (uses orderId, already Cancelled -> 400)
// [10] VNPay IPN
// [11] VNPay Return
// [12] Checkout VNPay Empty Cart Negative
// [13] Get My Orders No Token

ordersFolder.item = [
    addToCartItem,
    checkoutCOD,
    addToCartVNPayItem,
    checkoutVNPay,
    getMyOrders,
    getOrderById,
    getAllOrders,
    updateOrderStatus,
    cancelOrder,
    cancelCancelled,
    vnpayIPN,
    vnpayReturn,
    checkoutVNPayEmpty,
    getMyOrdersNoToken,
];

console.log('Orders folder now has', ordersFolder.item.length, 'requests');

// ── 4. Create Cleanup folder ────────────────────────────────────────────────
const cleanupFolder = {
    name: '🗑️ Cleanup',
    item: [
        deleteBatch,
        deleteProduct,
        deleteCategory,
        deleteFarm,
    ],
    description: 'Xóa các tài nguyên đã tạo trong quá trình test. Chạy SAU khi tất cả CRUD tests hoàn thành.',
};

// ── Fix: Inventory Alerts test — data is object not array
const inventoryFolder = c.item.find(f => f.name.match(/Inventory/));
if (inventoryFolder) {
    const alertsReq = inventoryFolder.item.find(r => r.name.match(/Get Inventory Alerts.*Admin/i));
    if (alertsReq && alertsReq.event) {
        alertsReq.event.forEach(evt => {
            if (evt.listen === 'test' && evt.script) {
                evt.script.exec = evt.script.exec.map(line => {
                    if (line.includes("pm.expect(res.data).to.be.an('array')")) {
                        return "pm.test('data có cấu trúc cảnh báo kho', () => { pm.expect(res.data).to.have.property('expiredBatches'); pm.expect(res.data).to.have.property('expiringBatches'); pm.expect(res.data).to.have.property('outOfStockProducts'); });";
                    }
                    if (line.includes('data là mảng cảnh báo')) {
                        return '';
                    }
                    return line;
                });
            }
        });
    }
    console.log('Fixed Inventory Alerts test script');
}

// ── Fix: Review Comment Quá Ngắn — send 1-char comment (minlength is 2)
const reviewsFolder = c.item.find(f => f.name.match(/Review/));
if (reviewsFolder) {
    const shortReview = reviewsFolder.item.find(r => r.name.match(/Ng.n.*Negative|Comment.*Ng.n/i));
    if (shortReview && shortReview.request.body && shortReview.request.body.raw) {
        const body = JSON.parse(shortReview.request.body.raw);
        body.comment = 'x'; // 1 char < minlength(2) → 400
        shortReview.request.body.raw = JSON.stringify(body, null, 2);
        console.log('Fixed Review short comment body: "x" (1 char < minlength 2)');
    }
}

// ── Fix: Wishlist Lấy Wishlist test — response is { wishlist: {...} } not { products: [...] }
const wishlistFolderFix = c.item.find(f => f.name.match(/Wishlist/));
if (wishlistFolderFix) {
    const getWishlistReq = wishlistFolderFix.item.find(r => r.name.match(/L.y Wishlist.*User|Get.*Wishlist/i));
    if (getWishlistReq && getWishlistReq.event) {
        getWishlistReq.event.forEach(evt => {
            if (evt.listen === 'test' && evt.script) {
                evt.script.exec = evt.script.exec.map(line =>
                    line
                        .replace("pm.expect(json.data).to.have.property('products')",
                            "pm.expect(json.data.wishlist).to.have.property('products')")
                        .replace("pm.expect(json.data.products).to.be.an('array')",
                            "pm.expect(json.data.wishlist.products).to.be.an('array')")
                );
            }
        });
        console.log('Fixed Wishlist Lấy Wishlist test script');
    }
}

// ── 5. Insert Cleanup folder before the last "404 Not Found" folder ────────
const lastFolderIdx = c.item.length - 1; // "❌ 404 Not Found"
c.item.splice(lastFolderIdx, 0, cleanupFolder);

console.log('\nFinal folder order:');
c.item.forEach((f, i) => console.log(i, f.name));

// ── 6. Add Admin Users (Role Management) folder ────────────────────────────
/**
 * Helper: tạo request item cho Admin Users folder.
 * customToken:
 *   - undefined  → kế thừa auth từ collection (adminToken)
 *   - 'noauth'   → không gửi token
 *   - '{{userToken}}' → gửi userToken thay vì adminToken
 */
function makeAdminUserItem(name, method, rawUrl, bodyObj, testExec, customToken) {
    const withoutBase = rawUrl.replace('{{baseUrl}}/', '');
    const [pathStr, queryStr] = withoutBase.split('?');
    const urlObj = {
        raw: rawUrl,
        host: ['{{baseUrl}}'],
        path: pathStr.split('/'),
    };
    if (queryStr) {
        urlObj.query = queryStr.split('&').map(p => {
            const [k, v] = p.split('=');
            return { key: k, value: v };
        });
    }

    const headers = [];
    if (bodyObj) headers.push({ key: 'Content-Type', value: 'application/json' });

    const item = {
        name,
        request: { method, header: headers, url: urlObj },
        event: [],
    };

    if (customToken === 'noauth') {
        item.request.auth = { type: 'noauth' };
    } else if (customToken) {
        // Dùng token cụ thể → tắt auth kế thừa + thêm header thủ công
        item.request.auth = { type: 'noauth' };
        item.request.header.push({ key: 'Authorization', value: `Bearer ${customToken}` });
    }

    if (bodyObj) {
        item.request.body = {
            mode: 'raw',
            raw: JSON.stringify(bodyObj, null, 2),
            options: { raw: { language: 'json' } },
        };
    }

    if (testExec) {
        item.event.push({
            listen: 'test',
            script: { type: 'text/javascript', exec: testExec },
        });
    }

    return item;
}

const adminUsersFolder = {
    name: '👥 Admin Users',
    description: 'Quản lý người dùng & phân quyền Role — Admin only.\nBusiness rule: Admin KHÔNG thể thay đổi role của Admin khác (cùng cấp bậc). Admin KHÔNG thể tự đổi role của chính mình.',
    item: [
        // 01 — List all users, save IDs for subsequent tests
        makeAdminUserItem(
            '01. Get All Users (Admin)',
            'GET',
            '{{baseUrl}}/users',
            null,
            [
                "pm.test('200 - Lấy danh sách users thành công', () => {",
                "    pm.response.to.have.status(200);",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.true;",
                "    pm.expect(json.data.users).to.be.an('array');",
                "    pm.expect(json.data.pagination).to.have.property('total');",
                "});",
                "const json = pm.response.json();",
                "if (json.data && json.data.users) {",
                "    const tu = json.data.users.find(u => u.email === 'testuser@cleanfood.vn');",
                "    if (tu) pm.collectionVariables.set('testUserId', tu._id);",
                "    const au = json.data.users.find(u => u.email === 'admin@cleanfood.vn');",
                "    if (au) pm.collectionVariables.set('adminUserId', au._id);",
                "    pm.test('testUserId và adminUserId được lưu', () => {",
                "        pm.expect(pm.collectionVariables.get('testUserId')).to.be.a('string').and.not.empty;",
                "        pm.expect(pm.collectionVariables.get('adminUserId')).to.be.a('string').and.not.empty;",
                "    });",
                "}",
            ]
        ),
        // 02 — Filter by role
        makeAdminUserItem(
            '02. Get Users — Filter by Role (Admin)',
            'GET',
            '{{baseUrl}}/users?role=user',
            null,
            [
                "pm.test('200 - Filter role=user thành công', () => {",
                "    pm.response.to.have.status(200);",
                "    const json = pm.response.json();",
                "    pm.expect(json.data.users).to.be.an('array');",
                "    json.data.users.forEach(u => pm.expect(u.role).to.equal('user'));",
                "});",
            ]
        ),
        // 03 — Search
        makeAdminUserItem(
            '03. Get Users — Search by Name/Email (Admin)',
            'GET',
            '{{baseUrl}}/users?search=test',
            null,
            [
                "pm.test('200 - Search user thành công', () => {",
                "    pm.response.to.have.status(200);",
                "    const json = pm.response.json();",
                "    pm.expect(json.data.users).to.be.an('array');",
                "    pm.expect(json.data.pagination).to.have.property('total');",
                "});",
            ]
        ),
        // 04 — Negative: No token
        makeAdminUserItem(
            '04. Get All Users — No Token (Negative)',
            'GET',
            '{{baseUrl}}/users',
            null,
            [
                "pm.test('401 - Không có token bị từ chối', () => {",
                "    pm.response.to.have.status(401);",
                "});",
            ],
            'noauth'
        ),
        // 05 — Negative: User role cannot change roles (testUser still 'user' at this point)
        makeAdminUserItem(
            '05. Update Role — User Role Cannot Change Role (Negative)',
            'PATCH',
            '{{baseUrl}}/users/{{testUserId}}/role',
            { role: 'admin' },
            [
                "pm.test('403 - User thông thường không có quyền thay đổi role', () => {",
                "    pm.response.to.have.status(403);",
                "});",
            ],
            '{{userToken}}'
        ),
        // 06 — Negative: Invalid role value
        makeAdminUserItem(
            '06. Update Role — Invalid Role Value (Negative)',
            'PATCH',
            '{{baseUrl}}/users/{{testUserId}}/role',
            { role: 'superadmin' },
            [
                "pm.test('400 - Role không hợp lệ bị từ chối', () => {",
                "    pm.response.to.have.status(400);",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.false;",
                "});",
            ]
        ),
        // 07 — Positive: Promote testUser to admin
        makeAdminUserItem(
            '07. Update Role — Promote User to Admin',
            'PATCH',
            '{{baseUrl}}/users/{{testUserId}}/role',
            { role: 'admin' },
            [
                "pm.test('200 - Thăng cấp User thành Admin thành công', () => {",
                "    pm.response.to.have.status(200);",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.true;",
                "    pm.expect(json.data.user.role).to.equal('admin');",
                "    pm.expect(json.data.user.email).to.equal('testuser@cleanfood.vn');",
                "});",
            ]
        ),
        // 08 — Negative: testUser is now admin → same-level protection
        makeAdminUserItem(
            '08. Update Role — Same Level Admin→Admin (Negative)',
            'PATCH',
            '{{baseUrl}}/users/{{testUserId}}/role',
            { role: 'user' },
            [
                "pm.test('403 - Không thể thay đổi role của Admin khác (cùng cấp bậc)', () => {",
                "    pm.response.to.have.status(403);",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.false;",
                "});",
            ]
        ),
        // 09 — Negative: Admin cannot change own role
        makeAdminUserItem(
            '09. Update Role — Self Change (Negative)',
            'PATCH',
            '{{baseUrl}}/users/{{adminUserId}}/role',
            { role: 'user' },
            [
                "pm.test('403 - Admin không thể tự đổi role của chính mình', () => {",
                "    pm.response.to.have.status(403);",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.false;",
                "});",
            ]
        ),
    ],
};

// Insert Admin Users folder before the Cleanup folder
const cleanupIdx = c.item.findIndex(f => f.name === '🗑️ Cleanup');
if (cleanupIdx !== -1) {
    c.item.splice(cleanupIdx, 0, adminUsersFolder);
    console.log('✅ Inserted Admin Users folder at index', cleanupIdx);
} else {
    c.item.splice(c.item.length - 1, 0, adminUsersFolder);
    console.log('✅ Inserted Admin Users folder before last folder (fallback)');
}

// ── 7. Write modified collection ───────────────────────────────────────────
fs.writeFileSync(collectionPath, JSON.stringify(c, null, 2), 'utf8');
console.log('\n✅ Collection saved to', collectionPath);
