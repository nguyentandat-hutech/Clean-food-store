// ============================================================
// FILE: backend/src/services/farmService.js
// Muc dich: Business logic quan ly trang trai (Farm)
// Admin co the tao, sua, xoa. Tat ca co the xem.
// ============================================================

// Nhap Model Farm
const Farm = require('../models/Farm');

// Nhap ham tao loi co HTTP status
const { createError } = require('../utils/responseHelper');

// Danh sach cac truong DUOC PHEP cap nhat (whitelist)
// Neu client gui cac truong khac (vi du: createdBy), se bi bo qua
const UPDATABLE_FIELDS = ['name', 'location', 'description', 'contact', 'certificate', 'isActive'];

// ── LAY DANH SACH TRANG TRAI (co phan trang & tim kiem) ─────────────────────
// Tham so: query — object chua cac tham so tu URL (?page=1&limit=10&search=...)
const getAllFarms = async (query) => {
    // Lay va dat gia tri mac dinh cho cac tham so phan trang
    const {
        page = 1,         // Trang hien tai, mac dinh la trang 1
        limit = 10,       // So luong moi trang, mac dinh 10
        certificate,      // Loc theo chung nhan (VietGAP,Organic,...)
        isActive,         // Loc theo trang thai hoat dong
        search,           // Tu khoa tim kiem
    } = query;

    // Math.max(1,...): dam bao page toi thieu la 1 (tranh trang am)
    const pageNum = Math.max(1, parseInt(page, 10));

    // Math.min(50,...): gioi han toi da 50 item/trang (tranh overload server)
    // Math.max(1,...): dam bao limit toi thieu la 1
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));

    // Tinh so documents can bo qua de den trang hien tai
    const skip = (pageNum - 1) * limitNum;

    // Tao object filter rong, se them dieu kien vao theo tung truong hop
    const filter = {};

    // Neu co loc theo certificate
    if (certificate) {
        // Danh sach chung nhan hop le
        const validCerts = ['VietGAP', 'Organic', 'GlobalGAP', 'Khac'];
        if (!validCerts.includes(certificate)) {
            throw createError(400, 'Chung nhan khong hop le. Chon mot trong: ' + validCerts.join(', '));
        }
        filter.certificate = certificate;
    }

    // Neu co loc theo isActive ('true'/'false' la string tu URL)
    if (isActive !== undefined) {
        // Chuyen chuoi 'true' thanh boolean true, cac truong hop con lai la false
        filter.isActive = isActive === 'true' || isActive === true;
    }

    // Neu co tu khoa tim kiem
    if (search && search.trim()) {
        // Tim kiem trong ca 2 truong: name va location
        // $regex: bieu thuc chinh quy — tim chuoi bat ky co chua tu khoa do
        // $options: 'i' — khong phan biet hoa thuong
        filter.$or = [
            { name: { $regex: search.trim(), $options: 'i' } },
            { location: { $regex: search.trim(), $options: 'i' } },
        ];
    }

    // Chay song song 2 query de tiet kiem thoi gian
    const [farms, total] = await Promise.all([
        Farm.find(filter)
            // .populate: thay the ObjectId createdBy bang thong tin thuc te cua User
            // Chi lay 2 truong: name va email (tranh lo du lieu nhayCam)
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 })  // Sap xep theo ngay tao: moi nhat len dau
            .skip(skip)               // Bo qua so luong theo phan trang
            .limit(limitNum),         // Gioi han so luong ket qua
        Farm.countDocuments(filter),  // Dem tong so kết qua (de tinh total pages)
    ]);

    return {
        farms,
        pagination: {
            total,                                      // Tong so trang trai khop dieu kien
            page: pageNum,                              // Trang dang xem
            limit: limitNum,                            // So item moi trang
            totalPages: Math.ceil(total / limitNum),    // Tong so trang (lam tron len)
        },
    };
};

// ── LAY CHI TIET 1 TRANG TRAI THEO ID ────────────────────────────────────────
// Tham so: farmId — MongoDB ObjectId cua farm
const getFarmById = async (farmId) => {
    // Tim farm theo ID, populate thong tin nguoi tao
    const farm = await Farm.findById(farmId).populate('createdBy', 'name email');
    if (!farm) {
        // 404 = Not Found — khong tim thay tai nguyen
        throw createError(404, 'Khong tim thay trang trai');
    }
    return farm;
};

// ── TAO TRANG TRAI MOI (Admin only) ──────────────────────────────────────────
// Tham so: data — object tu req.body; adminId — ID admin dang tao
const createFarm = async (data, adminId) => {
    // Lay cac truong can thiet tu data
    const { name, location, description, contact, certificate } = data;

    // Kiem tra: ten trang trai phai co it nhat 2 ky tu
    if (!name || name.trim().length < 2) {
        throw createError(400, 'Ten trang trai phai co it nhat 2 ky tu');
    }
    // Kiem tra: dia chi khong duoc de trong
    if (!location || !location.trim()) {
        throw createError(400, 'Dia chi trang trai khong duoc de trong');
    }
    // Kiem tra: thong tin lien he khong duoc de trong
    if (!contact || !contact.trim()) {
        throw createError(400, 'Thong tin lien he khong duoc de trong');
    }

    // Kiem tra: chung nhan phai hop le
    const validCerts = ['VietGAP', 'Organic', 'GlobalGAP', 'Khac'];
    if (!certificate || !validCerts.includes(certificate)) {
        throw createError(400, 'Chung nhan phai la mot trong: ' + validCerts.join(', '));
    }

    // Kiem tra trung: khong tao 2 trang trai co cung ten va cung dia chi
    // ^ bieu thi bat dau chuoi, $ bieu thi ket thuc — de khop chinh xac
    const existingFarm = await Farm.findOne({
        name: { $regex: '^' + name.trim() + '$', $options: 'i' },
        location: { $regex: '^' + location.trim() + '$', $options: 'i' },
    });
    if (existingFarm) {
        // 409 = Conflict — da ton tai, xung dot du lieu
        throw createError(409, 'Trang trai voi ten va dia diem nay da ton tai');
    }

    // Tao trang trai moi trong DB
    // .trim() — xoa khoang trang thua o dau/cuoi chuoi truoc khi luu
    const farm = await Farm.create({
        name: name.trim(),
        location: location.trim(),
        description: description ? description.trim() : '',  // Mo ta la tuy chon
        contact: contact.trim(),
        certificate,
        createdBy: adminId,  // Ghi nhan admin nao da tao
    });

    return farm;
};

// ── CAP NHAT TRANG TRAI (Admin only) ─────────────────────────────────────────
// Tham so: farmId — ID farm can sua; data — cac truong muon cap nhat
const updateFarm = async (farmId, data) => {
    // Kiem tra farm co ton tai khong truoc
    const farm = await Farm.findById(farmId);
    if (!farm) {
        throw createError(404, 'Khong tim thay trang trai');
    }

    // Validate tung truong NEU no duoc gui len (khong bat buoc phai gui het)
    if (data.name !== undefined) {
        if (!data.name || data.name.trim().length < 2) {
            throw createError(400, 'Ten trang trai phai co it nhat 2 ky tu');
        }
        if (data.name.trim().length > 100) {
            throw createError(400, 'Ten trang trai khong duoc vuot qua 100 ky tu');
        }
    }
    if (data.location !== undefined && !data.location.trim()) {
        throw createError(400, 'Dia chi trang trai khong duoc de trong');
    }
    if (data.contact !== undefined && !data.contact.trim()) {
        throw createError(400, 'Thong tin lien he khong duoc de trong');
    }
    if (data.certificate !== undefined) {
        const validCerts = ['VietGAP', 'Organic', 'GlobalGAP', 'Khac'];
        if (!validCerts.includes(data.certificate)) {
            throw createError(400, 'Chung nhan phai la mot trong: ' + validCerts.join(', '));
        }
    }

    // Chi lay cac truong nam trong whitelist UPDATABLE_FIELDS de cap nhat
    // Tranh client gui cac truong nguy hiem (vi du: createdBy, _id)
    const updateData = {};
    UPDATABLE_FIELDS.forEach((field) => {
        if (data[field] !== undefined) {
            // Neu la string thi .trim() cat khoang trang, boolean/so giu nguyen
            updateData[field] = typeof data[field] === 'string' ? data[field].trim() : data[field];
        }
    });

    // Kiem tra co du lieu de cap nhat khong
    if (Object.keys(updateData).length === 0) {
        throw createError(400, 'Khong co du lieu hop le de cap nhat');
    }

    // Cap nhat va tra ve document MOI sau khi sua
    // .populate: lay thong tin nguoi tao kem theo
    const updatedFarm = await Farm.findByIdAndUpdate(
        farmId,
        { $set: updateData },             // $set: chi ghi de cac truong trong updateData
        { new: true, runValidators: true } // new:true = tra ve ban moi; runValidators = kiem tra lai
    ).populate('createdBy', 'name email');

    return updatedFarm;
};

// ── XOA TRANG TRAI (Admin only) ───────────────────────────────────────────────
// Tham so: farmId — ID farm can xoa
const deleteFarm = async (farmId) => {
    // Kiem tra farm co ton tai khong
    const farm = await Farm.findById(farmId);
    if (!farm) {
        throw createError(404, 'Khong tim thay trang trai');
    }

    // Xoa vinh vien khoi DB
    await Farm.findByIdAndDelete(farmId);

    // Tra ve thong tin cua farm vua xoa de client co the cap nhat UI (xoa khoi danh sach)
    return { id: farmId, name: farm.name };
};

// Xuat 5 ham de farmController su dung
module.exports = { getAllFarms, getFarmById, createFarm, updateFarm, deleteFarm };
