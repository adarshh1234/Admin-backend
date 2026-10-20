import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { generateToken, isSuperAdmin, isAdmin, isStaff } from '../middleware/auth.js';

// In-memory rate limiter for login attempts (15-min window, max 5 attempts)
const loginAttempts = new Map();

function checkRateLimit(key) {
  const now = Date.now();
  const record = loginAttempts.get(key);
  if (!record) return { allowed: true };

  // 15-minute lock duration
  if (record.blockedUntil && now < record.blockedUntil) {
    const minutesLeft = Math.ceil((record.blockedUntil - now) / 60000);
    return {
      allowed: false,
      message: `Too many failed login attempts. Please try again in ${minutesLeft} minute(s).`,
    };
  }

  // Reset window if 15 minutes have passed
  if (now - record.firstAttempt > 15 * 60 * 1000) {
    loginAttempts.delete(key);
    return { allowed: true };
  }

  return { allowed: true };
}

function recordFailedAttempt(key) {
  const now = Date.now();
  const record = loginAttempts.get(key) || { attempts: 0, firstAttempt: now };
  record.attempts += 1;

  if (record.attempts >= 5) {
    record.blockedUntil = now + 15 * 60 * 1000; // Block for 15 minutes
  }

  loginAttempts.set(key, record);
}

function clearRateLimit(key) {
  loginAttempts.delete(key);
}

export const authController = {
  /**
   * Unified Role-Based Login Endpoint
   * Route: POST /api/auth/login
   * Validates credentials and checks role conformity against selectedRole.
   */
  async loginUnified(req, res) {
    try {
      const { username, password, selectedRole } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Both User ID/Username and Password are required.',
        });
      }

      const clientIp = req.ip || req.headers['x-forwarded-for'] || 'client';
      const cleanIdentifier = username.trim().toLowerCase();
      const rateLimitKey = `unified_${clientIp}_${cleanIdentifier}`;

      const rateLimit = checkRateLimit(rateLimitKey);
      if (!rateLimit.allowed) {
        return res.status(429).json({
          success: false,
          message: rateLimit.message,
        });
      }

      // Find user by username, email, or userId (case-insensitive)
      const user = await User.findOne({
        $or: [
          { username: cleanIdentifier },
          { email: cleanIdentifier },
          { userId: { $regex: new RegExp(`^${cleanIdentifier}$`, 'i') } },
        ],
      });

      if (!user) {
        recordFailedAttempt(rateLimitKey);
        return res.status(401).json({
          success: false,
          message: 'Invalid User ID / Username or Password.',
        });
      }

      // Verify password
      if (!user.passwordHash) {
        recordFailedAttempt(rateLimitKey);
        return res.status(401).json({
          success: false,
          message: 'Account password has not been configured. Please contact an administrator.',
        });
      }

      const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordMatch) {
        recordFailedAttempt(rateLimitKey);
        user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
        await user.save();
        return res.status(401).json({
          success: false,
          message: 'Invalid User ID / Username or Password.',
        });
      }

      // Check account status
      if (user.status === 'Locked') {
        return res.status(403).json({
          success: false,
          message: `Account is locked. ${user.lockoutReason || 'Please contact security administration.'}`,
        });
      }

      if (user.status === 'Inactive') {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated. Please contact security administration.',
        });
      }

      // Strict role verification if selectedRole is provided
      if (selectedRole) {
        const normSelected = selectedRole.trim().toLowerCase();

        if (normSelected === 'super admin' || normSelected.includes('super')) {
          if (!isSuperAdmin(user.role)) {
            recordFailedAttempt(rateLimitKey);
            const userType = isAdmin(user.role) ? 'Admin' : 'Staff';
            return res.status(403).json({
              success: false,
              message: `Role mismatch: This account has ${userType} privileges. Please switch to the ${userType} tab to sign in.`,
            });
          }
        } else if (normSelected === 'admin') {
          if (!isAdmin(user.role)) {
            recordFailedAttempt(rateLimitKey);
            const userType = isSuperAdmin(user.role) ? 'Super Admin' : 'Staff';
            return res.status(403).json({
              success: false,
              message: `Role mismatch: This account has ${userType} privileges. Please switch to the ${userType} tab to sign in.`,
            });
          }
        } else if (normSelected === 'staff') {
          if (!isStaff(user.role)) {
            recordFailedAttempt(rateLimitKey);
            const userType = isSuperAdmin(user.role) ? 'Super Admin' : 'Admin';
            return res.status(403).json({
              success: false,
              message: `Role mismatch: This account has ${userType} privileges. Please switch to the ${userType} tab to sign in.`,
            });
          }
        }
      }

      // Clear rate limiting on success
      clearRateLimit(rateLimitKey);

      // Update session statistics
      user.lastLogin = new Date();
      user.lastLoginIp = clientIp;
      user.failedLoginAttempts = 0;
      await user.save();

      const token = generateToken(user);

      return res.json({
        success: true,
        message: `${user.role} authenticated successfully.`,
        token,
        user: {
          id: user.id || user._id,
          userId: user.userId || `USR-${user.id || 1}`,
          username: user.username,
          displayName: user.displayName,
          email: user.email,
          role: user.role,
          allowedModules: user.allowedModules,
          department: user.department || 'Operations',
          status: user.status,
          avatarUrl: user.avatarUrl,
        },
      });
    } catch (err) {
      console.error('Unified Login Error:', err);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during authentication.',
      });
    }
  },

  /**
   * Super Admin Login Endpoint
   * Route: POST /api/auth/super-admin/login
   * Only authorizes accounts with Super Admin role.
   */
  async loginSuperAdmin(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Both User ID/Username and Password are required.',
        });
      }

      const clientIp = req.ip || req.headers['x-forwarded-for'] || 'client';
      const rateLimitKey = `super_admin_${clientIp}_${username.trim().toLowerCase()}`;

      const rateLimit = checkRateLimit(rateLimitKey);
      if (!rateLimit.allowed) {
        return res.status(429).json({
          success: false,
          message: rateLimit.message,
        });
      }

      const cleanIdentifier = username.trim().toLowerCase();

      // Find user by username, email, or userId
      const user = await User.findOne({
        $or: [
          { username: cleanIdentifier },
          { email: cleanIdentifier },
          { userId: { $regex: new RegExp(`^${cleanIdentifier}$`, 'i') } },
        ],
      });

      if (!user) {
        recordFailedAttempt(rateLimitKey);
        return res.status(401).json({
          success: false,
          message: 'Invalid User ID/Username or Password.',
        });
      }

      // Verify password
      if (!user.passwordHash) {
        recordFailedAttempt(rateLimitKey);
        return res.status(401).json({
          success: false,
          message: 'Account password has not been initialized. Please contact system administrator.',
        });
      }

      const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordMatch) {
        recordFailedAttempt(rateLimitKey);
        user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
        await user.save();
        return res.status(401).json({
          success: false,
          message: 'Invalid User ID/Username or Password.',
        });
      }

      // Check account status
      if (user.status === 'Locked') {
        return res.status(403).json({
          success: false,
          message: `Account is locked. ${user.lockoutReason || 'Please contact security administration.'}`,
        });
      }

      if (user.status === 'Inactive') {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated. Please contact security administration.',
        });
      }

      // Enforce Super Admin role ONLY
      if (!isSuperAdmin(user.role)) {
        recordFailedAttempt(rateLimitKey);
        return res.status(403).json({
          success: false,
          message: 'Access Denied: Only authorized Super Administrators can log in through this portal.',
        });
      }

      // Clear rate limiting on success
      clearRateLimit(rateLimitKey);

      // Update session statistics
      user.lastLogin = new Date();
      user.lastLoginIp = clientIp;
      user.failedLoginAttempts = 0;
      await user.save();

      const token = generateToken(user);

      return res.json({
        success: true,
        message: 'Super Admin authenticated successfully.',
        token,
        user: {
          id: user.id || user._id,
          userId: user.userId || `SA-${user.id || 1}`,
          username: user.username,
          displayName: user.displayName,
          email: user.email,
          role: user.role,
          allowedModules: user.allowedModules,
          department: user.department || 'Executive',
          status: user.status,
          avatarUrl: user.avatarUrl,
        },
      });
    } catch (err) {
      console.error('Super Admin Login Error:', err);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during authentication.',
      });
    }
  },

  /**
   * Admin Login Endpoint
   * Route: POST /api/auth/admin/login
   * Authorizes Admin and Staff credentials created by Super Admin.
   */
  async loginAdmin(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Both Admin/Staff ID and Password are required.',
        });
      }

      const clientIp = req.ip || req.headers['x-forwarded-for'] || 'client';
      const rateLimitKey = `admin_${clientIp}_${username.trim().toLowerCase()}`;

      const rateLimit = checkRateLimit(rateLimitKey);
      if (!rateLimit.allowed) {
        return res.status(429).json({
          success: false,
          message: rateLimit.message,
        });
      }

      const cleanIdentifier = username.trim().toLowerCase();

      // Find user by username, email, or userId
      const user = await User.findOne({
        $or: [
          { username: cleanIdentifier },
          { email: cleanIdentifier },
          { userId: { $regex: new RegExp(`^${cleanIdentifier}$`, 'i') } },
        ],
      });

      if (!user) {
        recordFailedAttempt(rateLimitKey);
        return res.status(401).json({
          success: false,
          message: 'Invalid Admin ID or Password.',
        });
      }

      // Verify password
      if (!user.passwordHash) {
        recordFailedAttempt(rateLimitKey);
        return res.status(401).json({
          success: false,
          message: 'Account password has not been configured. Please contact administrator.',
        });
      }

      const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordMatch) {
        recordFailedAttempt(rateLimitKey);
        user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
        await user.save();
        return res.status(401).json({
          success: false,
          message: 'Invalid Admin ID or Password.',
        });
      }

      // Check account status
      if (user.status === 'Locked') {
        return res.status(403).json({
          success: false,
          message: `Account is locked. ${user.lockoutReason || 'Please contact administrator.'}`,
        });
      }

      if (user.status === 'Inactive') {
        return res.status(403).json({
          success: false,
          message: 'Account has been deactivated. Please contact administrator.',
        });
      }

      // Clear rate limiting on success
      clearRateLimit(rateLimitKey);

      // Update session statistics
      user.lastLogin = new Date();
      user.lastLoginIp = clientIp;
      user.failedLoginAttempts = 0;
      await user.save();

      const token = generateToken(user);

      return res.json({
        success: true,
        message: 'Authenticated successfully.',
        token,
        user: {
          id: user.id || user._id,
          userId: user.userId || `USR-${user.id || 1}`,
          username: user.username,
          displayName: user.displayName,
          email: user.email,
          role: user.role,
          allowedModules: user.allowedModules,
          department: user.department || 'Operations',
          status: user.status,
          avatarUrl: user.avatarUrl,
        },
      });
    } catch (err) {
      console.error('Admin Login Error:', err);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during authentication.',
      });
    }
  },

  /**
   * Get Current Authenticated User
   * Route: GET /api/auth/me
   */
  async getMe(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated.',
        });
      }

      res.json({
        success: true,
        user: {
          id: req.user.id || req.user._id,
          userId: req.user.userId,
          username: req.user.username,
          displayName: req.user.displayName,
          email: req.user.email,
          role: req.user.role,
          allowedModules: req.user.allowedModules,
          department: req.user.department,
          status: req.user.status,
          avatarUrl: req.user.avatarUrl,
          createdAt: req.user.createdAt,
          lastLogin: req.user.lastLogin,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  /**
   * Logout Endpoint
   * Route: POST /api/auth/logout
   */
  async logout(_req, res) {
    res.json({
      success: true,
      message: 'Logged out successfully.',
    });
  },

  /**
   * Legacy Users list
   */
  async getUsers(_req, res) {
    try {
      const users = await User.find({}).sort({ id: 1 }).lean();
      res.json(users);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
};

export default authController;
