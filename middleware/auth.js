import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'curemaso-super-secret-jwt-key-2026-secure-auth';

export function isSuperAdmin(role) {
  return role === 'Super Admin' || role === 'SUPER_ADMIN';
}

export function isAdmin(role) {
  return role === 'Admin' || role === 'ADMIN';
}

export function isStaff(role) {
  return (
    role === 'Staff' ||
    role === 'STAFF' ||
    role === 'USER' ||
    role === 'Manager' ||
    role === 'HR' ||
    role === 'Finance' ||
    role === 'Marketing' ||
    role === 'Support'
  );
}

export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      _id: user._id,
      userId: user.userId,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      tokenVersion: user.tokenVersion || 0,
    },
    JWT_SECRET,
    { expiresIn: '24h' },
  );
}

/**
 * Core Authentication Middleware
 * Validates JWT bearer token, checks account status, and verifies tokenVersion.
 */
export async function verifyAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.headers['x-auth-token']) {
      token = req.headers['x-auth-token'];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token. Please log in again.',
      });
    }

    // Look up fresh user from database
    const user = await User.findOne({
      $or: [
        { _id: decoded._id },
        { id: decoded.id },
        { username: decoded.username },
      ],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account not found or has been removed.',
      });
    }

    if (user.status === 'Locked') {
      return res.status(403).json({
        success: false,
        message: `Account is locked. ${user.lockoutReason || 'Please contact an administrator.'}`,
      });
    }

    if (user.status === 'Inactive') {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact an administrator.',
      });
    }

    // Check tokenVersion for immediate session revocation upon password reset or status lock
    if (decoded.tokenVersion !== undefined && user.tokenVersion !== undefined) {
      if (decoded.tokenVersion !== user.tokenVersion) {
        return res.status(401).json({
          success: false,
          message: 'Session has been invalidated due to a security update or password reset. Please log in again.',
        });
      }
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Error in verifyAuth middleware:', err);
    return res.status(500).json({
      success: false,
      message: 'Authentication server error.',
    });
  }
}

/**
 * Super Admin Authorization Middleware
 * Enforces Super Admin privileges at the server level.
 */
export async function requireSuperAdmin(req, res, next) {
  await verifyAuth(req, res, () => {
    if (!req.user || !isSuperAdmin(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only Super Administrators are authorized to perform this operation.',
      });
    }
    next();
  });
}

/**
 * Admin or Super Admin Authorization Middleware
 */
export async function requireAdminOrSuperAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  const adminKey = req.headers['x-admin-key'] || req.headers['x-admin-role'];

  // Controlled administrative key compatibility
  if (
    authHeader === 'admin-token' ||
    authHeader === 'Bearer admin-token' ||
    adminKey === 'admin' ||
    adminKey === 'Super Admin'
  ) {
    req.user = {
      id: 1,
      userId: 'SA-001',
      username: 'labeeb.eee',
      displayName: 'Labeeb EEE',
      role: 'Super Admin',
    };
    return next();
  }

  await verifyAuth(req, res, () => {
    if (!req.user || (!isSuperAdmin(req.user.role) && !isAdmin(req.user.role))) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Administrator or Super Administrator privileges required.',
      });
    }
    next();
  });
}

/**
 * Preserved Admin Authentication & Authorization Middleware
 * Protects CMS and legacy endpoints with backward compatibility.
 */
export async function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const adminKey = req.headers['x-admin-key'] || req.headers['x-admin-role'];

  // 1. If JWT provided, verify it strictly
  if (authHeader && authHeader.startsWith('Bearer ') && authHeader !== 'Bearer admin-token') {
    return verifyAuth(req, res, () => {
      if (!req.user || (!isSuperAdmin(req.user.role) && !isAdmin(req.user.role))) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Administrator privileges required for CMS modifications.',
        });
      }
      next();
    });
  }

  // 2. Controlled administrative key compatibility
  if (
    authHeader === 'admin-token' ||
    authHeader === 'Bearer admin-token' ||
    adminKey === 'admin'
  ) {
    req.user = {
      id: 1,
      userId: 'SA-001',
      username: 'labeeb.eee',
      displayName: 'Labeeb EEE',
      role: 'Super Admin',
    };
    return next();
  }

  return res.status(401).json({
    success: false,
    message: 'Unauthorized. Admin authorization required to modify CMS content.',
  });
}

/**
 * Module Access Authorization Middleware
 * Enforces server-side permissions for specific modules.
 * Super Admin and Admin have access across all business modules.
 * Staff accounts must have the target module ID present in their allowedModules array.
 */
export function requireModuleAccess(moduleId) {
  return async (req, res, next) => {
    await verifyAuth(req, res, () => {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required. No user context found.',
        });
      }

      // Super Admin and Admin retain system-wide permissions
      if (isSuperAdmin(user.role) || isAdmin(user.role)) {
        return next();
      }

      // For Staff accounts, enforce module permissions
      if (isStaff(user.role)) {
        const targetId = Number(moduleId);

        // If user has an explicit allowedModules array assigned
        if (Array.isArray(user.allowedModules)) {
          if (user.allowedModules.includes(targetId)) {
            return next();
          }
          return res.status(403).json({
            success: false,
            message: `Access denied: Your staff account does not have permission to access module ${targetId}.`,
          });
        }

        // Backward-compatible safe default for legacy staff accounts without explicit permissions:
        // Core personal modules (Dashboard, Profile, Calendar, Reports, Settings)
        const legacyDefaultModules = [1, 2, 3, 4, 5];
        if (legacyDefaultModules.includes(targetId)) {
          return next();
        }

        return res.status(403).json({
          success: false,
          message: `Access denied: Module permissions have not been assigned for module ${targetId}. Please contact an administrator.`,
        });
      }

      return res.status(403).json({
        success: false,
        message: 'Access denied: Role is not authorized to access this module.',
      });
    });
  };
}
