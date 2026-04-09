// ============================================================
// FILE: backend/src/services/userService.js
// Muc dich: Business logic lien quan den quan ly nguoi dung
// ============================================================

// Nhap mongoose de su dung isValidObjectId
const mongoose = require('mongoose');

// Nhap Model User de truy van DB
const User = require('../models/User');

// Nhap ham tao loi co status code
const { createError } = require('../utils/responseHelper');

// -- LAY THONG TIN CA NHAN --
// Tham so: userId - ID cua nguoi dung dang dang nhap
const getProfile = async (userId) => {
    // Tim user trong DB theo ID, khong tra lai __v va password (da co select:false)
    const user = await User.findById(userId);
    if (!user) {
        throw createError(404, 'Khong tim thay nguoi dung');
    }
    return user;
};

// -- CAP NHAT THONG TIN CA NHAN --
// Tham so: userId - ID nguoi dung; data - { name, phone }
const updateProfile = async (userId, data) => {
    // Chi cho phep cap nhat 2 truong: name va phone (khong the tu doi email, role)
    const { name, phone } = data;

    // Kiem tra phai co it nhat 1 truong de cap nhat
    if (!name && !phone) {
        throw createError(400, 'Vui long cung cap thong tin can cap nhat');
    }

    // Tao object chi chua du lieu hop le (loai bo undefined)
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (phone) updateData.phone = phone.trim();

    // findByIdAndUpdate: tim theo ID va cap nhat
    // { $set: updateData } — chi cap nhat cac truong trong updateData, khong xoa truong khac
    // { new: true } — tra ve document SAU khi cap nhat (mac dinh la truoc khi cap nhat)
    // { runValidators: true } — chay lai Mongoose validators khi update
    const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true }
    );

    if (!updatedUser) {
        throw createError(404, 'Khong tim thay nguoi dung');
    }
    return updatedUser;
};

// -- LAY DANH SACH TẤT CA NGUOI DUNG (Admin only) --
// Tham so: query object tu URL — { page, limit, search, role }
const getAllUsers = async ({ page = 1, limit = 10, search, role } = {}) => {
    // Xay dung dieu kien loc (filter)
    const query = {};

    // Neu co tham so role (admin/user), loc theo role do
    if (role && ['user', 'admin'].includes(role)) {
        query.role = role;
    }

    // Neu co tu khoa tim kiem, dung $or de tim trong ca 2 truong name va email
    if (search) {
        // $or: thoa man 1 trong cac dieu kien
        // $regex: tim kiem theo bieu thuc chinh quy (regex)
        // $options: 'i' — khong phan biet hoa thuong (case insensitive)
        query['$or'] = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
        ];
    }

    // Chuyen page va limit thanh so nguyen (URL params la string)
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    // Tinh so documents can bo qua (skip) de phan trang
    // Vi du: page=2, limit=10 → skip=10 (bo qua 10 docs dau tien)
    const skip = (pageNum - 1) * limitNum;

    // Chay 2 query song song (Promise.all) de toi uu toc do:
    // 1. Lay danh sach users theo trang
    // 2. Dem tong so users phuc vu viec hien thi so trang
    const [users, total] = await Promise.all([
        User.find(query)
            .sort({ createdAt: -1 })  // Sap xep moi nhat len dau
            .skip(skip)               // Bo qua so luong theo phan trang
            .limit(limitNum),         // Gioi han so luong tra ve
        User.countDocuments(query)    // Dem tong so ket qua
    ]);

    return {
        users,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            // Math.ceil: lam tron len — vi du 21 users / 10 = 2.1 → 3 trang
            totalPages: Math.ceil(total / limitNum)
        }
    };
};

// -- CAP NHAT ROLE NGUOI DUNG (Admin only) --
// Tham so: adminId - ID admin dang thuc hien; targetUserId - ID user bi doi; newRole - role moi
const updateUserRole = async (adminId, targetUserId, newRole) => {
    // Kiem tra targetUserId co dung dinh dang MongoDB ObjectId khong
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
        throw createError(400, 'ID nguoi dung khong hop le');
    }

    // Kiem tra role moi co nam trong danh sach hop le khong
    if (!newRole || !['user', 'admin'].includes(newRole)) {
        throw createError(400, 'Role khong hop le. Chi chap nhan: user, admin');
    }

    // Quy tac 1: Admin khong the tu doi role cua chinh minh
    if (adminId.toString() === targetUserId.toString()) {
        throw createError(403, 'Ban khong the thay doi role cua chinh minh');
    }

    // Tim user can cap nhat
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
        throw createError(404, 'Khong tim thay nguoi dung can cap nhat');
    }

    // Quy tac 2: Khong the ha cap admin khac xuong user (bao ve admin)
    if (targetUser.role === 'admin' && newRole === 'user') {
        throw createError(403, 'Khong the ha cap quyen cua admin khac');
    }

    // Quy tac 3: Tranh cap nhat neu role khong thay doi
    if (targetUser.role === newRole) {
        throw createError(400, `Nguoi dung da co role "${newRole}"`);
    }

    // Thay doi role va luu vao DB (dung .save() thay vi findByIdAndUpdate
    // de kich hoat Mongoose validators va middleware neu co)
    targetUser.role = newRole;
    await targetUser.save();

    return targetUser;
};

// Xuat 4 ham de userController su dung
module.exports = { getProfile, updateProfile, getAllUsers, updateUserRole };
