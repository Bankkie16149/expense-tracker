const prisma = require('../db/prisma');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const emailService = require('../services/emailService');
const authController = {
  async register(req, res, next) {
    try {
      const { email, password, name } = req.body;
      
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword
        }
      });

      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
      res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name, isPro: user.isPro, profilePic: user.profilePic, hasSetPrefs: user.hasSetPrefs, notifyEmail: user.notifyEmail, themeColor: user.themeColor, customLogoUrl: user.customLogoUrl } });
    } catch (error) {
      next(error);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(401).json({ message: 'Email or password is wrong' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Email or password is wrong' });
      }

      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: user.id, email: user.email, name: user.name, isPro: user.isPro, profilePic: user.profilePic, hasSetPrefs: user.hasSetPrefs, notifyEmail: user.notifyEmail, themeColor: user.themeColor, customLogoUrl: user.customLogoUrl, customAppName: user.customAppName } });
    } catch (error) {
      next(error);
    }
  },

  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiry = new Date(Date.now() + 3600000); // 1 hour

      await prisma.user.update({
        where: { email },
        data: {
          resetPasswordToken: resetToken,
          resetPasswordExpires: tokenExpiry
        }
      });

      const resetUrl = `${process.env.FRONTEND_URL || 'https://fintrack.vercel.app'}/reset-password/${resetToken}`;

      await emailService.sendEmail(
        user.email,
        'Password Reset Request / ตั้งรหัสผ่านใหม่',
        `You requested a password reset.\n\nPlease click on the following link to reset your password:\n${resetUrl}\n\nIf you did not request this, please ignore this email.`
      );

      res.json({ message: 'Password reset link sent to email' });
    } catch (error) {
      next(error);
    }
  },

  async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;
      
      const user = await prisma.user.findFirst({
        where: {
          resetPasswordToken: token,
          resetPasswordExpires: { gt: new Date() }
        }
      });

      if (!user) {
        return res.status(400).json({ message: 'Password reset token is invalid or has expired' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetPasswordToken: null,
          resetPasswordExpires: null
        }
      });

      res.json({ message: 'Password has been reset successfully' });
    } catch (error) {
      next(error);
    }
  },

  async upgrade(req, res, next) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { slipUrl } = req.body;

      const user = await prisma.user.update({
        where: { id: req.user.id },
        data: { 
          proStatus: 'pending',
          proSlipUrl: slipUrl || null
        }
      });

      res.json({ message: 'Upgrade request submitted', user: { id: user.id, email: user.email, name: user.name, isPro: user.isPro, proStatus: user.proStatus, profilePic: user.profilePic } });
    } catch (error) {
      next(error);
    }
  },

  async updateProfilePic(req, res, next) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { profilePic } = req.body;

      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: { profilePic }
      });

      res.json({ user: { id: updatedUser.id, email: updatedUser.email, name: updatedUser.name, isPro: updatedUser.isPro, profilePic: updatedUser.profilePic, hasSetPrefs: updatedUser.hasSetPrefs, notifyEmail: updatedUser.notifyEmail, themeColor: updatedUser.themeColor, customLogoUrl: updatedUser.customLogoUrl, customAppName: updatedUser.customAppName } });
    } catch (error) {
      next(error);
    }
  },

  async updateNotificationSettings(req, res, next) {
    try {
      const { notifyEmail } = req.body;
      const userId = req.user.id;
      
      const user = await prisma.user.update({
        where: { id: userId },
        data: { 
          notifyEmail,
          hasSetPrefs: true
        }
      });
      
      res.json({ message: 'Settings updated', user: { id: user.id, email: user.email, name: user.name, isPro: user.isPro, profilePic: user.profilePic, hasSetPrefs: user.hasSetPrefs, notifyEmail: user.notifyEmail, themeColor: user.themeColor, customLogoUrl: user.customLogoUrl } });
    } catch (error) {
      next(error);
    }
  },

  async updateProfile(req, res, next) {
    try {
      const { name, email } = req.body;
      const userId = req.user.id;

      if (!name || !email) {
        return res.status(400).json({ message: 'Name and email are required' });
      }

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({ message: 'ไม่สามารถใช้อีเมลนี้ได้ เนื่องจากผู้ใช้ท่านอื่นใช้แล้ว' });
      }

      let updatedUser;
      try {
        updatedUser = await prisma.user.update({
          where: { id: userId },
          data: { name, email }
        });
      } catch (err) {
        if (err.code === 'P2002') {
          return res.status(409).json({ message: 'ไม่สามารถใช้อีเมลนี้ได้ เนื่องจากผู้ใช้ท่านอื่นใช้แล้ว' });
        }
        throw err;
      }

      res.json({ user: { id: updatedUser.id, email: updatedUser.email, name: updatedUser.name, isPro: updatedUser.isPro, profilePic: updatedUser.profilePic, hasSetPrefs: updatedUser.hasSetPrefs, notifyEmail: updatedUser.notifyEmail, themeColor: updatedUser.themeColor, customLogoUrl: updatedUser.customLogoUrl, customAppName: updatedUser.customAppName } });
    } catch (error) {
      next(error);
    }
  },

  async getMe(req, res, next) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json({ user: { id: user.id, email: user.email, name: user.name, isPro: user.isPro, profilePic: user.profilePic, hasSetPrefs: user.hasSetPrefs, notifyEmail: user.notifyEmail, themeColor: user.themeColor, customLogoUrl: user.customLogoUrl, customAppName: user.customAppName } });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = authController;
