import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { isSuperAdmin, isAdmin } from '../middleware/auth.js';

/**
 * Check if the current user is the owner/manager of the target user
 */
function isStaffOwner(currentUser, targetUser) {
  if (isSuperAdmin(currentUser.role)) return true;

  const isCreatedBy =
    (targetUser.createdBy && targetUser.createdBy.toString() === currentUser._id.toString()) ||
    (targetUser.createdById && targetUser.createdById === currentUser.id);

  const isAssigned =
    targetUser.assignedAdminId &&
    (targetUser.assignedAdminId === currentUser.userId ||
      targetUser.assignedAdminId === currentUser.username);

  return Boolean(isCreatedBy || isAssigned);
}

export const userController = {
  /**
   * List Users with Role-Based Scoping & Search Filters
   * Route: GET /api/users
   */
  async getUsers(req, res) {
    try {
      const { search, role, status } = req.query;
      const currentUser = req.user;

      let filter = {};

      if (isSuperAdmin(currentUser.role)) {
        // Super Admin sees all users across the ERP system
        if (role && role !== 'All') {
          filter.role = role;
        }
      } else if (isAdmin(currentUser.role)) {
        // Admin sees ONLY their own assigned/created Staff accounts
        const adminScope = [
          { createdBy: currentUser._id },
          { createdById: currentUser.id },
        ];
        if (currentUser.userId) {
          adminScope.push({ assignedAdminId: currentUser.userId });
        }
        if (currentUser.username) {
          adminScope.push({ assignedAdminId: currentUser.username });
        }

        filter = {
          $or: adminScope,
          role: {
            $in: [
              'Staff',
              'STAFF',
              'USER',
              'Manager',
              'HR',
              'Finance',
              'Marketing',
              'Support',
            ],
          },
        };

        if (role && role !== 'All') {
          filter.role = role;
        }
      } else {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Staff accounts cannot access user administration.',
        });
      }

      if (status && status !== 'All') {
        if (status === 'Active') {
          filter.status = { $in: ['Active', null] };
        } else {
          filter.status = status;
        }
      }

      if (search && search.trim()) {
        const q = search.trim();
        const searchRegex = new RegExp(q, 'i');
        const searchFilter = {
          $or: [
            { username: searchRegex },
            { displayName: searchRegex },
            { fullName: searchRegex },
            { email: searchRegex },
            { userId: searchRegex },
            { department: searchRegex },
          ],
        };

        if (filter.$or) {
          filter = {
            $and: [{ $or: filter.$or }, searchFilter],
          };
          if (filter.role) filter.role = filter.role;
          if (filter.status) filter.status = filter.status;
        } else {
          filter = { ...filter, ...searchFilter };
        }
      }

      const users = await User.find(filter)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .lean();

      const formattedUsers = users.map((u) => {
        const username =
          u.username ||
          (u.email ? u.email.split('@')[0] : '') ||
          (u.userId ? u.userId.toLowerCase() : '') ||
          `user_${(u._id || '').toString().slice(-6)}`;
        const displayName =
          u.displayName ||
          u.fullName ||
          username ||
          (u.email ? u.email.split('@')[0] : 'User');
        const id = u.id || u._id;
        const userId =
          u.userId ||
          (u.id
            ? `USR-${u.id}`
            : u._id
              ? `USR-${u._id.toString().slice(-6).toUpperCase()}`
              : 'USR-0');

        return {
          ...u,
          id,
          userId,
          username,
          displayName,
          status: u.status || 'Active',
          department: u.department || 'General',
          createdByName: u.createdByName || 'System',
          allowedModules: u.allowedModules || undefined,
        };
      });

      return res.json({
        success: true,
        count: formattedUsers.length,
        users: formattedUsers,
      });
    } catch (err) {
      console.error('Error in getUsers:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  /**
   * Get User Management Stats (Role-Scoped)
   * Route: GET /api/users/stats
   */
  async getUserStats(req, res) {
    try {
      const currentUser = req.user;

      if (isSuperAdmin(currentUser.role)) {
        const [totalUsers, totalAdmins, totalStaff, activeUsers, lockedUsers] = await Promise.all([
          User.countDocuments(),
          User.countDocuments({ role: { $in: ['Admin', 'ADMIN'] } }),
          User.countDocuments({
            role: {
              $nin: ['Admin', 'ADMIN', 'Super Admin', 'SUPER_ADMIN'],
            },
          }),
          User.countDocuments({ status: { $in: ['Active', null] } }),
          User.countDocuments({ status: { $in: ['Locked', 'Inactive'] } }),
        ]);

        return res.json({
          success: true,
          isSuperAdmin: true,
          stats: {
            totalUsers,
            totalAdmins,
            totalStaff,
            activeUsers,
            lockedUsers,
          },
        });
      }

      if (isAdmin(currentUser.role)) {
        const adminScope = {
          $or: [
            { createdBy: currentUser._id },
            { createdById: currentUser.id },
            { assignedAdminId: currentUser.userId || currentUser.username },
          ],
          role: {
            $in: [
              'Staff',
              'STAFF',
              'USER',
              'Manager',
              'HR',
              'Finance',
              'Marketing',
              'Support',
            ],
          },
        };

        const [myStaffCount, myActiveStaff, myLockedStaff] = await Promise.all([
          User.countDocuments(adminScope),
          User.countDocuments({ ...adminScope, status: { $in: ['Active', null] } }),
          User.countDocuments({ ...adminScope, status: { $in: ['Locked', 'Inactive'] } }),
        ]);

        return res.json({
          success: true,
          isSuperAdmin: false,
          stats: {
            totalUsers: myStaffCount,
            totalAdmins: 0,
            totalStaff: myStaffCount,
            activeUsers: myActiveStaff,
            lockedUsers: myLockedStaff,
          },
        });
      }

      return res.status(403).json({ success: false, message: 'Access denied.' });
    } catch (err) {
      console.error('Error in getUserStats:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  /**
   * Create User (Admin or Staff)
   * Route: POST /api/users
   */
  async createUser(req, res) {
    try {
      const currentUser = req.user;
      const {
        userId,
        username,
        email,
        displayName,
        role = 'Staff',
        department = 'General',
        password,
        allowedModules,
      } = req.body;

      if (!username || !email || !displayName || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username, email, display name, and initial password are required.',
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Initial password must be at least 6 characters long.',
        });
      }

      const cleanUsername = username.trim().toLowerCase();
      const cleanEmail = email.trim().toLowerCase();

      // Check for duplicate username or email
      const existingUser = await User.findOne({
        $or: [{ username: cleanUsername }, { email: cleanEmail }],
      });

      if (existingUser) {
        if (existingUser.username === cleanUsername) {
          return res.status(409).json({
            success: false,
            message: `Username '${cleanUsername}' is already taken.`,
          });
        }
        return res.status(409).json({
          success: false,
          message: `Email '${cleanEmail}' is already registered.`,
        });
      }

      // Role permission check
      if (isAdmin(currentUser.role)) {
        // Admins CANNOT create Admins or Super Admins
        if (isSuperAdmin(role) || isAdmin(role)) {
          return res.status(403).json({
            success: false,
            message: 'Privilege escalation prevented: Administrators are only permitted to create Staff accounts.',
          });
        }
      }

      // Generate or validate unique User ID
      let finalUserId = userId ? userId.trim().toUpperCase() : null;
      if (finalUserId) {
        const idExists = await User.findOne({ userId: finalUserId });
        if (idExists) {
          return res.status(409).json({
            success: false,
            message: `User ID '${finalUserId}' already exists.`,
          });
        }
      } else {
        // Auto-generate consistent User ID
        const prefix = role === 'Admin' ? 'ADM' : 'STF';
        let isUnique = false;
        while (!isUnique) {
          const randNum = Math.floor(100 + Math.random() * 900);
          finalUserId = `${prefix}-${randNum}`;
          const existing = await User.findOne({ userId: finalUserId });
          if (!existing) isUnique = true;
        }
      }

      // Hash initial password
      const passwordHash = await bcrypt.hash(password, 10);

      // Find max legacy numeric ID
      const maxIdDoc = await User.findOne({}).sort({ id: -1 }).select('id').lean();
      const nextNumericId = maxIdDoc && maxIdDoc.id ? maxIdDoc.id + 1 : Date.now() % 100000;

      // Validate and sanitize allowedModules permissions
      let cleanAllowedModules = undefined;
      if (Array.isArray(allowedModules)) {
        cleanAllowedModules = allowedModules
          .map(Number)
          .filter((n) => !isNaN(n) && n > 0);

        if (isAdmin(currentUser.role)) {
          // Administrators cannot grant access to central Admin console (53) or User Management (9)
          cleanAllowedModules = cleanAllowedModules.filter((id) => id !== 53 && id !== 9);
        }
      }

      const newUser = await User.create({
        id: nextNumericId,
        userId: finalUserId,
        username: cleanUsername,
        email: cleanEmail,
        displayName: displayName.trim(),
        role: role === 'Admin' ? 'Admin' : 'Staff',
        department: department.trim(),
        allowedModules: cleanAllowedModules,
        passwordHash,
        status: 'Active',
        createdBy: currentUser._id,
        createdById: currentUser.id,
        createdByName: currentUser.displayName,
        createdByRole: currentUser.role,
        assignedAdminId: currentUser.userId || currentUser.username,
        tokenVersion: 0,
      });

      const userObject = newUser.toObject();
      delete userObject.passwordHash;
      delete userObject.__v;

      return res.status(201).json({
        success: true,
        message: `${role} account '${cleanUsername}' created successfully.`,
        user: userObject,
      });
    } catch (err) {
      console.error('Error in createUser:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  /**
   * Update User Account
   * Route: PUT /api/users/:id
   */
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const currentUser = req.user;
      const { displayName, email, department, role, status, allowedModules } = req.body;

      const userQuery = mongoose.Types.ObjectId.isValid(id)
        ? { _id: id }
        : isNaN(Number(id))
          ? { userId: id }
          : { id: Number(id) };

      const targetUser = await User.findOne(userQuery);
      if (!targetUser) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      // Authorization checks
      if (isAdmin(currentUser.role)) {
        // Admin cannot modify another Admin or Super Admin
        if (isAdmin(targetUser.role) || isSuperAdmin(targetUser.role)) {
          return res.status(403).json({
            success: false,
            message: 'Access denied: Administrators cannot modify Administrator or Super Administrator accounts.',
          });
        }

        // Admin can ONLY modify their own assigned staff
        if (!isStaffOwner(currentUser, targetUser)) {
          return res.status(403).json({
            success: false,
            message: 'Access denied: You can only modify your own assigned staff accounts.',
          });
        }

        // Admin cannot elevate staff to Admin
        if (role && (isAdmin(role) || isSuperAdmin(role))) {
          return res.status(403).json({
            success: false,
            message: 'Privilege escalation denied: Cannot assign Administrator role.',
          });
        }
      }

      // Check email uniqueness if email changed
      if (email && email.toLowerCase().trim() !== targetUser.email) {
        const cleanEmail = email.toLowerCase().trim();
        const emailExists = await User.findOne({
          email: cleanEmail,
          _id: { $ne: targetUser._id },
        });
        if (emailExists) {
          return res.status(409).json({
            success: false,
            message: `Email '${cleanEmail}' is already in use by another account.`,
          });
        }
        targetUser.email = cleanEmail;
      }

      if (displayName) targetUser.displayName = displayName.trim();
      if (department) targetUser.department = department.trim();

      if (isSuperAdmin(currentUser.role) && role) {
        targetUser.role = role;
      }

      // Handle module access assignment for Staff accounts
      if (allowedModules !== undefined) {
        if (Array.isArray(allowedModules)) {
          let cleanModules = allowedModules
            .map(Number)
            .filter((n) => !isNaN(n) && n > 0);

          if (isAdmin(currentUser.role)) {
            // Administrators cannot assign central Admin console (53) or User Management (9)
            cleanModules = cleanModules.filter((id) => id !== 53 && id !== 9);
          }
          targetUser.allowedModules = cleanModules;
        } else if (allowedModules === null) {
          targetUser.allowedModules = undefined;
        }
      }

      if (status && ['Active', 'Inactive', 'Locked'].includes(status)) {
        if (status !== targetUser.status && status === 'Locked') {
          targetUser.tokenVersion = (targetUser.tokenVersion || 0) + 1;
        }
        targetUser.status = status;
      }

      await targetUser.save();

      const userObject = targetUser.toObject();
      delete userObject.passwordHash;
      delete userObject.__v;

      return res.json({
        success: true,
        message: `Account '${targetUser.username}' updated successfully.`,
        user: userObject,
      });
    } catch (err) {
      console.error('Error in updateUser:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  /**
   * Reset User Password
   * Route: POST /api/users/:id/reset-password
   */
  async resetPassword(req, res) {
    try {
      const { id } = req.params;
      const currentUser = req.user;
      const { newPassword } = req.body;

      const userQuery = mongoose.Types.ObjectId.isValid(id)
        ? { _id: id }
        : isNaN(Number(id))
          ? { userId: id }
          : { id: Number(id) };

      const targetUser = await User.findOne(userQuery);
      if (!targetUser) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      // Authorization checks
      if (isAdmin(currentUser.role)) {
        if (isAdmin(targetUser.role) || isSuperAdmin(targetUser.role)) {
          return res.status(403).json({
            success: false,
            message: 'Access denied: Administrators cannot reset passwords for other Administrators.',
          });
        }
        if (!isStaffOwner(currentUser, targetUser)) {
          return res.status(403).json({
            success: false,
            message: 'Access denied: You can only reset passwords for your assigned staff accounts.',
          });
        }
      }

      let passwordToSet = newPassword;
      let isGenerated = false;

      if (!passwordToSet || !passwordToSet.trim()) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
        passwordToSet = Array.from(
          { length: 12 },
          () => chars[Math.floor(Math.random() * chars.length)],
        ).join('');
        isGenerated = true;
      }

      if (passwordToSet.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long.',
        });
      }

      targetUser.passwordHash = await bcrypt.hash(passwordToSet, 10);
      // Invalidate existing sessions immediately
      targetUser.tokenVersion = (targetUser.tokenVersion || 0) + 1;
      targetUser.failedLoginAttempts = 0;
      targetUser.lockoutUntil = null;
      if (targetUser.status === 'Locked') {
        targetUser.status = 'Active';
        targetUser.lockoutReason = null;
      }

      await targetUser.save();

      return res.json({
        success: true,
        message: `Password reset successfully for @${targetUser.username}. All previous sessions have been invalidated.`,
        generatedPassword: isGenerated ? passwordToSet : undefined,
      });
    } catch (err) {
      console.error('Error in resetPassword:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  /**
   * Toggle Account Status (Activate / Deactivate / Lock)
   * Route: PATCH /api/users/:id/status
   */
  async toggleStatus(req, res) {
    try {
      const { id } = req.params;
      const currentUser = req.user;
      const { status, reason } = req.body;

      if (!['Active', 'Inactive', 'Locked'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be 'Active', 'Inactive', or 'Locked'.",
        });
      }

      const userQuery = mongoose.Types.ObjectId.isValid(id)
        ? { _id: id }
        : isNaN(Number(id))
          ? { userId: id }
          : { id: Number(id) };

      const targetUser = await User.findOne(userQuery);
      if (!targetUser) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      // Prevent locking own account
      if (
        targetUser._id.toString() === currentUser._id.toString() ||
        targetUser.username === currentUser.username
      ) {
        return res.status(400).json({
          success: false,
          message: 'Security policy: You cannot deactivate or lock your own account.',
        });
      }

      // Authorization checks
      if (isAdmin(currentUser.role)) {
        if (isAdmin(targetUser.role) || isSuperAdmin(targetUser.role)) {
          return res.status(403).json({
            success: false,
            message: 'Access denied: Administrators cannot change status of other Administrators.',
          });
        }
        if (!isStaffOwner(currentUser, targetUser)) {
          return res.status(403).json({
            success: false,
            message: 'Access denied: You can only manage status of your assigned staff accounts.',
          });
        }
      }

      targetUser.status = status;
      if (status === 'Locked') {
        targetUser.lockoutReason = reason || 'Account locked by administrator.';
        // Invalidate sessions immediately on lock
        targetUser.tokenVersion = (targetUser.tokenVersion || 0) + 1;
      } else if (status === 'Inactive') {
        targetUser.tokenVersion = (targetUser.tokenVersion || 0) + 1;
      } else if (status === 'Active') {
        targetUser.lockoutReason = null;
        targetUser.failedLoginAttempts = 0;
      }

      await targetUser.save();

      const userObject = targetUser.toObject();
      delete userObject.passwordHash;

      return res.json({
        success: true,
        message: `Status for @${targetUser.username} set to '${status}'.`,
        user: userObject,
      });
    } catch (err) {
      console.error('Error in toggleStatus:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  /**
   * Delete User Account
   * Route: DELETE /api/users/:id
   */
  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const currentUser = req.user;

      const userQuery = mongoose.Types.ObjectId.isValid(id)
        ? { _id: id }
        : isNaN(Number(id))
          ? { userId: id }
          : { id: Number(id) };

      const targetUser = await User.findOne(userQuery);
      if (!targetUser) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      // Prevent self-deletion
      if (
        targetUser._id.toString() === currentUser._id.toString() ||
        targetUser.username === currentUser.username
      ) {
        return res.status(400).json({
          success: false,
          message: 'Security policy: You cannot delete your own account.',
        });
      }

      // Authorization checks
      if (isAdmin(currentUser.role)) {
        if (isAdmin(targetUser.role) || isSuperAdmin(targetUser.role)) {
          return res.status(403).json({
            success: false,
            message: 'Access denied: Administrators cannot delete other Administrators.',
          });
        }
        if (!isStaffOwner(currentUser, targetUser)) {
          return res.status(403).json({
            success: false,
            message: 'Access denied: You can only delete your assigned staff accounts.',
          });
        }
      }

      await User.deleteOne({ _id: targetUser._id });

      return res.json({
        success: true,
        message: `Account @${targetUser.username} (${targetUser.displayName}) deleted successfully.`,
      });
    } catch (err) {
      console.error('Error in deleteUser:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },
};

export default userController;
