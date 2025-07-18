const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Schema } = mongoose;

/**
 * User Authentication Schema
 * JWT-compatible user accounts with security features
 */
const userSchema = new Schema({
  // Primary identifier
  _id: {
    type: Schema.Types.ObjectId,
    auto: true
  },
  
  // Authentication credentials
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Please provide a valid email address'
    ],
    index: true
  },
  
  password: {
    type: String,
    required: true,
    minlength: 8,
    validate: {
      validator: function(password) {
        // Password must contain at least one uppercase, lowercase, number, and special char
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(password);
      },
      message: 'Password must contain at least one uppercase letter, lowercase letter, number, and special character'
    }
  },
  
  // Profile information
  profile: {
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    dateOfBirth: {
      type: Date,
      validate: {
        validator: function(date) {
          const age = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 365);
          return age >= 13; // COPPA compliance
        },
        message: 'User must be at least 13 years old'
      }
    },
    avatar: {
      type: String,
      default: 'default_avatar.png'
    },
    country: {
      type: String,
      maxlength: 2,
      uppercase: true
    },
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'sv', 'da', 'no'],
      index: true
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  
  // Account status and verification
  status: {
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true
    },
    isBanned: {
      type: Boolean,
      default: false,
      index: true
    },
    banReason: {
      type: String,
      default: null
    },
    banExpiresAt: {
      type: Date,
      default: null
    }
  },
  
  // Email verification
  emailVerification: {
    token: {
      type: String,
      default: null
    },
    expiresAt: {
      type: Date,
      default: null
    },
    verifiedAt: {
      type: Date,
      default: null
    }
  },
  
  // Password reset
  passwordReset: {
    token: {
      type: String,
      default: null
    },
    expiresAt: {
      type: Date,
      default: null
    },
    requestedAt: {
      type: Date,
      default: null
    }
  },
  
  // Two-factor authentication
  twoFactor: {
    isEnabled: {
      type: Boolean,
      default: false
    },
    secret: {
      type: String,
      default: null
    },
    backupCodes: [{
      type: String
    }],
    lastUsed: {
      type: Date,
      default: null
    }
  },
  
  // Social authentication
  socialAuth: {
    google: {
      id: String,
      email: String,
      connectedAt: Date
    },
    facebook: {
      id: String,
      email: String,
      connectedAt: Date
    },
    apple: {
      id: String,
      email: String,
      connectedAt: Date
    },
    discord: {
      id: String,
      username: String,
      connectedAt: Date
    }
  },
  
  // Subscription and premium features
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'premium', 'pro', 'enterprise'],
      default: 'free',
      index: true
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'expired', 'trial'],
      default: 'active'
    },
    startDate: {
      type: Date,
      default: null
    },
    endDate: {
      type: Date,
      default: null
    },
    trialEndsAt: {
      type: Date,
      default: null
    },
    paymentProvider: {
      type: String,
      enum: ['stripe', 'paypal', 'apple', 'google'],
      default: null
    },
    subscriptionId: {
      type: String,
      default: null
    }
  },
  
  // Security and login tracking
  security: {
    lastLogin: {
      type: Date,
      default: null,
      index: true
    },
    lastLoginIP: {
      type: String,
      default: null
    },
    loginAttempts: {
      type: Number,
      default: 0
    },
    lockoutUntil: {
      type: Date,
      default: null
    },
    sessionTokens: [{
      token: String,
      createdAt: Date,
      expiresAt: Date,
      deviceInfo: String,
      ipAddress: String
    }],
    securityLog: [{
      action: {
        type: String,
        enum: ['login', 'logout', 'password_change', 'email_change', '2fa_enable', '2fa_disable', 'account_locked']
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      ipAddress: String,
      userAgent: String,
      success: Boolean
    }]
  },
  
  // Privacy and preferences
  privacy: {
    marketingEmails: {
      type: Boolean,
      default: true
    },
    dataProcessing: {
      type: Boolean,
      default: true,
      required: true
    },
    analyticsTracking: {
      type: Boolean,
      default: true
    },
    profileVisibility: {
      type: String,
      enum: ['public', 'friends', 'private'],
      default: 'public'
    }
  },
  
  // Audit trail
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  deletedAt: {
    type: Date,
    default: null,
    index: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// Indexes for authentication and security
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ 'status.isActive': 1, 'status.isBanned': 1 });
userSchema.index({ 'security.lastLogin': -1 });
userSchema.index({ 'subscription.plan': 1, 'subscription.status': 1 });
userSchema.index({ 'profile.language': 1 });

// Compound indexes for common queries
userSchema.index({ 
  'status.isActive': 1, 
  'status.isVerified': 1, 
  'status.isBanned': 1 
});

// TTL index for expired tokens
userSchema.index({ 
  'emailVerification.expiresAt': 1 
}, { 
  expireAfterSeconds: 0 
});

userSchema.index({ 
  'passwordReset.expiresAt': 1 
}, { 
  expireAfterSeconds: 0 
});

// Sharding strategy: shard by email hash
userSchema.index({ email: 'hashed' });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.profile.firstName} ${this.profile.lastName}`;
});

// Virtual for account age
userSchema.virtual('accountAge').get(function() {
  return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24));
});

// Pre-save middleware for password hashing
userSchema.pre('save', async function(next) {
  // Only hash password if it's been modified
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with salt rounds of 12
    this.password = await bcrypt.hash(this.password, 12);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware for updated timestamp
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Methods for authentication
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateJWT = function() {
  return jwt.sign(
    {
      id: this._id,
      email: this.email,
      plan: this.subscription.plan,
      isVerified: this.status.isVerified
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      issuer: 'llama-wool-farm',
      audience: 'llama-wool-farm-users'
    }
  );
};

userSchema.methods.generateRefreshToken = function() {
  return jwt.sign(
    {
      id: this._id,
      type: 'refresh'
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: '30d',
      issuer: 'llama-wool-farm',
      audience: 'llama-wool-farm-users'
    }
  );
};

// Methods for email verification
userSchema.methods.generateEmailVerificationToken = function() {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  
  this.emailVerification.token = token;
  this.emailVerification.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  return token;
};

userSchema.methods.verifyEmail = function(token) {
  if (this.emailVerification.token !== token) {
    throw new Error('Invalid verification token');
  }
  
  if (this.emailVerification.expiresAt < new Date()) {
    throw new Error('Verification token has expired');
  }
  
  this.status.isVerified = true;
  this.emailVerification.verifiedAt = new Date();
  this.emailVerification.token = null;
  this.emailVerification.expiresAt = null;
  
  return this.save();
};

// Methods for password reset
userSchema.methods.generatePasswordResetToken = function() {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  
  this.passwordReset.token = token;
  this.passwordReset.expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  this.passwordReset.requestedAt = new Date();
  
  return token;
};

userSchema.methods.resetPassword = function(token, newPassword) {
  if (this.passwordReset.token !== token) {
    throw new Error('Invalid reset token');
  }
  
  if (this.passwordReset.expiresAt < new Date()) {
    throw new Error('Reset token has expired');
  }
  
  this.password = newPassword;
  this.passwordReset.token = null;
  this.passwordReset.expiresAt = null;
  this.passwordReset.requestedAt = null;
  
  // Invalidate all existing sessions
  this.security.sessionTokens = [];
  
  return this.save();
};

// Methods for account security
userSchema.methods.incrementLoginAttempts = function() {
  const maxAttempts = 5;
  const lockoutTime = 15 * 60 * 1000; // 15 minutes
  
  this.security.loginAttempts += 1;
  
  if (this.security.loginAttempts >= maxAttempts) {
    this.security.lockoutUntil = new Date(Date.now() + lockoutTime);
  }
  
  return this.save();
};

userSchema.methods.resetLoginAttempts = function() {
  this.security.loginAttempts = 0;
  this.security.lockoutUntil = null;
  return this.save();
};

userSchema.methods.isLocked = function() {
  return this.security.lockoutUntil && this.security.lockoutUntil > new Date();
};

userSchema.methods.logSecurityEvent = function(action, ipAddress, userAgent, success = true) {
  this.security.securityLog.push({
    action: action,
    timestamp: new Date(),
    ipAddress: ipAddress,
    userAgent: userAgent,
    success: success
  });
  
  // Keep only last 100 security events
  if (this.security.securityLog.length > 100) {
    this.security.securityLog = this.security.securityLog.slice(-100);
  }
  
  return this.save();
};

// Methods for session management
userSchema.methods.createSession = function(deviceInfo, ipAddress) {
  const sessionToken = jwt.sign(
    {
      userId: this._id,
      sessionId: new mongoose.Types.ObjectId().toString(),
      type: 'session'
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  this.security.sessionTokens.push({
    token: sessionToken,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    deviceInfo: deviceInfo,
    ipAddress: ipAddress
  });
  
  return sessionToken;
};

userSchema.methods.invalidateSession = function(sessionToken) {
  this.security.sessionTokens = this.security.sessionTokens.filter(
    session => session.token !== sessionToken
  );
  
  return this.save();
};

userSchema.methods.invalidateAllSessions = function() {
  this.security.sessionTokens = [];
  return this.save();
};

// Static methods for user management
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ 
    email: email.toLowerCase(),
    'status.isActive': true,
    deletedAt: null
  });
};

userSchema.statics.findActiveUsers = function(limit = 100) {
  return this.find({
    'status.isActive': true,
    'status.isBanned': false,
    deletedAt: null
  })
  .limit(limit)
  .sort({ 'security.lastLogin': -1 })
  .select('-password -security.sessionTokens')
  .lean();
};

userSchema.statics.getUserStats = function() {
  return this.aggregate([
    {
      $match: { deletedAt: null }
    },
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: {
          $sum: {
            $cond: [{ $eq: ['$status.isActive', true] }, 1, 0]
          }
        },
        verifiedUsers: {
          $sum: {
            $cond: [{ $eq: ['$status.isVerified', true] }, 1, 0]
          }
        },
        premiumUsers: {
          $sum: {
            $cond: [{ $ne: ['$subscription.plan', 'free'] }, 1, 0]
          }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('User', userSchema);