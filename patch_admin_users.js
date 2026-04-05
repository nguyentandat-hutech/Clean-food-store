/**
 * patch_admin_users.js
 * Adds "👥 Admin Users" folder to the Postman collection.
 * Reads from Clean-Food-Store.postman_collection.json (already-fixed collection),
 * inserts the new folder before "🗑️ Cleanup", then writes back.
 * Idempotent: removes existing Admin Users folder before re-inserting.
 */

const fs = require('fs');

const collectionPath = './Clean-Food-Store.postman_collection.json';
const backendPath = './backend/Clean-Food-Store.postman_collection.json';

const c = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

// ── Ensure testUserId & adminUserId exist as collection variables ────────────
['testUserId', 'adminUserId'].forEach(key => {
    if (!c.variable.find(v => v.key === key)) {
        c.variable.push({ key, value: '' });
        console.log(`Added collection variable: ${key}`);
    }
});

// ── Helper ──────────────────────────────────────────────────────────────────
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

// ── Build Admin Users folder ────────────────────────────────────────────────
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
                "    pm.expect(json.data.users).to.be.an('array').and.not.empty;",
                "    pm.expect(json.data.pagination).to.have.all.keys('page','limit','total','totalPages');",
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
        // 02 — Filter by role=user — must NOT include admin accounts
        makeAdminUserItem(
            '02. Get Users — Filter by Role (Admin)',
            'GET',
            '{{baseUrl}}/users?role=user',
            null,
            [
                "pm.test('200 - Filter role=user: chỉ trả về user thường', () => {",
                "    pm.response.to.have.status(200);",
                "    const json = pm.response.json();",
                "    pm.expect(json.data.users).to.be.an('array');",
                "    json.data.users.forEach(u => pm.expect(u.role).to.equal('user'));",
                "    // admin@cleanfood.vn (role=admin) không được xuất hiện",
                "    const found = json.data.users.find(u => u.email === 'admin@cleanfood.vn');",
                "    pm.expect(found).to.be.undefined;",
                "});",
            ]
        ),
        // 03 — Search: verify results contain keyword in name or email
        makeAdminUserItem(
            '03. Get Users — Search by Name/Email (Admin)',
            'GET',
            '{{baseUrl}}/users?search=test',
            null,
            [
                "pm.test('200 - Search trả về đúng kết quả', () => {",
                "    pm.response.to.have.status(200);",
                "    const json = pm.response.json();",
                "    pm.expect(json.data.users).to.be.an('array');",
                "    pm.expect(json.data.pagination.total).to.be.at.least(1);",
                "    json.data.users.forEach(u => {",
                "        const match = u.name.toLowerCase().includes('test') || u.email.toLowerCase().includes('test');",
                "        pm.expect(match).to.be.true;",
                "    });",
                "});",
            ]
        ),
        // 04 — Pagination: page=1&limit=1 → only 1 result, totalPages >= 1
        makeAdminUserItem(
            '04. Get Users — Pagination (Admin)',
            'GET',
            '{{baseUrl}}/users?page=1&limit=1',
            null,
            [
                "pm.test('200 - Phân trang hoạt động đúng', () => {",
                "    pm.response.to.have.status(200);",
                "    const json = pm.response.json();",
                "    pm.expect(json.data.users).to.be.an('array').and.have.lengthOf(1);",
                "    pm.expect(json.data.pagination.limit).to.equal(1);",
                "    pm.expect(json.data.pagination.page).to.equal(1);",
                "    pm.expect(json.data.pagination.totalPages).to.be.at.least(1);",
                "});",
            ]
        ),
        // 05 — Negative: No token → 401
        makeAdminUserItem(
            '05. Get All Users — No Token (Negative)',
            'GET',
            '{{baseUrl}}/users',
            null,
            [
                "pm.test('401 - Không có token bị từ chối', () => {",
                "    pm.response.to.have.status(401);",
                "    pm.expect(pm.response.json().success).to.be.false;",
                "});",
            ],
            'noauth'
        ),
        // 06 — Negative: Non-admin token (userToken) → 403
        makeAdminUserItem(
            '06. Update Role — User Role Forbidden (Negative)',
            'PATCH',
            '{{baseUrl}}/users/{{testUserId}}/role',
            { role: 'admin' },
            [
                "pm.test('403 - User thông thường không có quyền thay đổi role', () => {",
                "    pm.response.to.have.status(403);",
                "    pm.expect(pm.response.json().success).to.be.false;",
                "});",
            ],
            '{{userToken}}'
        ),
        // 07 — Negative: Role already 'user' (testUser is still 'user' at this point) → 400
        makeAdminUserItem(
            '07. Update Role — Role Already Same (Negative)',
            'PATCH',
            '{{baseUrl}}/users/{{testUserId}}/role',
            { role: 'user' },
            [
                "pm.test('400 - Role đã giống nhau bị từ chối', () => {",
                "    pm.response.to.have.status(400);",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.false;",
                "    pm.expect(json.message).to.include('đã có role');",
                "});",
            ]
        ),
        // 08 — Negative: Invalid role value → 400
        makeAdminUserItem(
            '08. Update Role — Invalid Role Value (Negative)',
            'PATCH',
            '{{baseUrl}}/users/{{testUserId}}/role',
            { role: 'superadmin' },
            [
                "pm.test('400 - Role không hợp lệ bị từ chối', () => {",
                "    pm.response.to.have.status(400);",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.false;",
                "    pm.expect(json.message).to.include('Role không hợp lệ');",
                "});",
            ]
        ),
        // 09 — Negative: Invalid ObjectId format → 400
        makeAdminUserItem(
            '09. Update Role — Invalid ObjectId (Negative)',
            'PATCH',
            '{{baseUrl}}/users/not-a-valid-id/role',
            { role: 'user' },
            [
                "pm.test('400 - ObjectId không hợp lệ bị từ chối', () => {",
                "    pm.response.to.have.status(400);",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.false;",
                "});",
            ]
        ),
        // 10 — Negative: User not found (valid ObjectId but doesn't exist) → 404
        makeAdminUserItem(
            '10. Update Role — User Not Found (Negative)',
            'PATCH',
            '{{baseUrl}}/users/000000000000000000000000/role',
            { role: 'user' },
            [
                "pm.test('404 - User không tồn tại bị từ chối', () => {",
                "    pm.response.to.have.status(404);",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.false;",
                "});",
            ]
        ),
        // 11 — Positive: Promote testUser from 'user' → 'admin'
        makeAdminUserItem(
            '11. Update Role — Promote User to Admin',
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
                "    pm.expect(json.data.user._id).to.equal(pm.collectionVariables.get('testUserId'));",
                "});",
            ]
        ),
        // 12 — Negative: testUser is now admin → same-level blocks any role change → 403
        makeAdminUserItem(
            '12. Update Role — Same Level Admin→Admin (Negative)',
            'PATCH',
            '{{baseUrl}}/users/{{testUserId}}/role',
            { role: 'user' },
            [
                "pm.test('403 - Không thể thay đổi role của Admin khác (cùng cấp bậc)', () => {",
                "    pm.response.to.have.status(403);",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.false;",
                "    pm.expect(json.message).to.include('Admin khác');",
                "});",
            ]
        ),
        // 13 — Negative: Admin cannot change own role → 403
        makeAdminUserItem(
            '13. Update Role — Self Change (Negative)',
            'PATCH',
            '{{baseUrl}}/users/{{adminUserId}}/role',
            { role: 'user' },
            [
                "pm.test('403 - Admin không thể tự đổi role của chính mình', () => {",
                "    pm.response.to.have.status(403);",
                "    const json = pm.response.json();",
                "    pm.expect(json.success).to.be.false;",
                "    pm.expect(json.message).to.include('chính mình');",
                "});",
            ]
        ),
    ],
};

// ── Idempotent: remove existing Admin Users folder if present ───────────────
const existingIdx = c.item.findIndex(f => f.name === '👥 Admin Users');
if (existingIdx !== -1) {
    c.item.splice(existingIdx, 1);
    console.log('Removed existing Admin Users folder');
}

// ── Insert before Cleanup folder ────────────────────────────────────────────
const cleanupIdx = c.item.findIndex(f => f.name.toLowerCase().includes('cleanup'));
if (cleanupIdx !== -1) {
    c.item.splice(cleanupIdx, 0, adminUsersFolder);
    console.log('✅ Inserted Admin Users folder at index', cleanupIdx, '(before Cleanup)');
} else {
    c.item.splice(c.item.length - 1, 0, adminUsersFolder);
    console.log('✅ Inserted Admin Users folder before last folder (fallback)');
}

// ── Final folder order ───────────────────────────────────────────────────────
console.log('\nFinal folder order:');
c.item.forEach((f, i) => console.log(i, f.name));

// ── Write both copies ────────────────────────────────────────────────────────
fs.writeFileSync(collectionPath, JSON.stringify(c, null, 2), 'utf8');
fs.writeFileSync(backendPath, JSON.stringify(c, null, 2), 'utf8');
console.log('\n✅ Collection saved to', collectionPath);
console.log('✅ Backend copy synced to', backendPath);
