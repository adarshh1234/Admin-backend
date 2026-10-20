import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, sparse: true },
    userId: { type: String, unique: true, sparse: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    displayName: { type: String, trim: true, default: function() { return this.fullName || this.username || 'User'; } },
    fullName: { type: String, default: null, trim: true },
    phone: { type: String, default: null, trim: true },
    entityType: { type: String, enum: ['company', 'institution', 'startup', null], default: null },
    provider: { type: String, default: 'email' },
    emailVerified: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    avatarUrl: { type: String, default: null },
    role: {
      type: String,
      enum: [
        'Super Admin',
        'Admin',
        'Staff',
        'SUPER_ADMIN',
        'ADMIN',
        'STAFF',
        'USER',
        'user',
        'recruiter',
        'admin',
        'Manager',
        'HR',
        'Finance',
        'Marketing',
        'Support',
        'Custom Role',
      ],
      default: 'Staff',
    },
    allowedModules: { type: [Number], default: undefined },
    department: { type: String, default: 'General' },
    passwordHash: { type: String, default: null },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Locked'],
      default: 'Active',
    },
    lockoutReason: { type: String, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdById: { type: Number, default: null },
    createdByName: { type: String, default: 'System' },
    createdByRole: { type: String, default: 'System' },
    assignedAdminId: { type: String, default: null },
    tokenVersion: { type: Number, default: 0 },
    failedLoginAttempts: { type: Number, default: 0 },
    lockoutUntil: { type: Date, default: null },
    lastLogin: { type: Date, default: null },
    lastLoginIp: { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret.id || ret._id;
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  },
);

export default mongoose.models.User || mongoose.model('User', UserSchema);
