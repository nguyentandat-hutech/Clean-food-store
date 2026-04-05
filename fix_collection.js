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
const { v4: uuidv4 } = require('crypto').randomUUID ? { v4: () => require('crypto').randomUUID() } : { v4: () => 'xxxx-xxxx'.replace(/x/g, () => Math.floor(Math.random()*16).toString(16)) };
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

// ── 6. Write modified collection ───────────────────────────────────────────
fs.writeFileSync(collectionPath, JSON.stringify(c, null, 2), 'utf8');
console.log('\n✅ Collection saved to', collectionPath);
