const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const SETTINGS_FILE = path.join(__dirname, '../db/systemSettings.json');

const ensureSettingsTable = async () => {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SystemSetting" (
        "key" TEXT PRIMARY KEY,
        "value" TEXT NOT NULL,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (e) {
    // Fallback to file if DB table creation fails
  }
};

const readLocalSettings = () => {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    }
  } catch (e) {}
  return { coPayEnabled: true, coPayWarningText: '' };
};

const writeLocalSettings = (data) => {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {}
};

exports.getSystemSettings = async (req, res) => {
  try {
    await ensureSettingsTable();
    const rows = await prisma.$queryRawUnsafe(`SELECT "key", "value" FROM "SystemSetting" WHERE "key" IN ('coPayEnabled', 'coPayWarningText')`);
    if (Array.isArray(rows) && rows.length > 0) {
      const map = {};
      rows.forEach(r => { map[r.key] = r.value; });
      const settings = {
        coPayEnabled: map.coPayEnabled !== undefined ? map.coPayEnabled === 'true' : true,
        coPayWarningText: map.coPayWarningText || ''
      };
      writeLocalSettings(settings);
      return res.json(settings);
    }
  } catch (error) {
    console.error('DB settings read fallback:', error.message);
  }
  return res.json(readLocalSettings());
};

exports.updateSystemSettings = async (req, res) => {
  try {
    const coPayEnabled = Boolean(req.body.coPayEnabled);
    const coPayWarningText = typeof req.body.coPayWarningText === 'string' ? req.body.coPayWarningText.trim() : '';

    const settings = { coPayEnabled, coPayWarningText };
    writeLocalSettings(settings);

    try {
      await ensureSettingsTable();
      await prisma.$executeRawUnsafe(
        `INSERT INTO "SystemSetting" ("key", "value", "updatedAt") VALUES ('coPayEnabled', $1, CURRENT_TIMESTAMP)
         ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = CURRENT_TIMESTAMP`,
        String(coPayEnabled)
      );
      await prisma.$executeRawUnsafe(
        `INSERT INTO "SystemSetting" ("key", "value", "updatedAt") VALUES ('coPayWarningText', $1, CURRENT_TIMESTAMP)
         ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = CURRENT_TIMESTAMP`,
        coPayWarningText
      );
    } catch (dbErr) {
      console.error('DB settings write fallback:', dbErr.message);
    }

    res.json({ message: 'System settings updated', ...settings });
  } catch (error) {
    console.error('Error updating system settings:', error);
    res.status(500).json({ error: 'Failed to update system settings' });
  }
};

// Get all users with their balance (sum of income - expense transactions)
exports.getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        isPro: true,
        createdAt: true,
        themeColor: true,
        customLogoUrl: true,
        customAppName: true,
        transactions: {
          select: {
            amount: true,
            category: { select: { type: true } }
          }
        }
      }
    });

    const usersWithBalance = users.map(user => {
      let balance = 0;
      user.transactions.forEach(tx => {
        if (tx.category.type === 'income') {
          balance += tx.amount;
        } else {
          balance -= tx.amount;
        }
      });
      
      const adminEmail = process.env.ADMIN_EMAIL;
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        isPro: user.isPro,
        isAdmin: Boolean(adminEmail && user.email === adminEmail),
        createdAt: user.createdAt,
        themeColor: user.themeColor,
        customLogoUrl: user.customLogoUrl,
        customAppName: user.customAppName,
        balance
      };
    });

    res.json(usersWithBalance);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Create user
exports.createUser = async (req, res) => {
  try {
    const { email, password, name, isPro } = req.body;
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        isPro: isPro || false
      }
    });

    res.status(201).json({ message: 'User created successfully', user: { id: newUser.id, email: newUser.email } });
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, isPro, themeColor, customLogoUrl, customAppName } = req.body;
    
    console.log(`[updateUser] Updating user \${id} with themeColor: \${themeColor}, customAppName: \${customAppName}`);
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (isPro !== undefined) updateData.isPro = isPro;
    if (themeColor !== undefined) updateData.themeColor = themeColor;
    if (customLogoUrl !== undefined) updateData.customLogoUrl = customLogoUrl;
    if (customAppName !== undefined) updateData.customAppName = customAppName;
    
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: updateData
    });

    res.json({ message: 'User updated successfully', user: { id: updatedUser.id, email: updatedUser.email, themeColor: updatedUser.themeColor, customLogoUrl: updatedUser.customLogoUrl, customAppName: updatedUser.customAppName } });
  } catch (error) {
    console.error('Error updating user:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to update user' });
  }
};

// Delete user with Cascade
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = Number(id);

    // Using transaction for cascade delete
    await prisma.$transaction([
      prisma.transaction.deleteMany({ where: { userId } }),
      prisma.savingsTransaction.deleteMany({ where: { userId } }),
      prisma.savingsGoal.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } })
    ]);

    res.json({ message: 'User and all associated data deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// Get user transactions
exports.getUserTransactions = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = Number(id);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, isPro: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const transactions = await prisma.transaction.findMany({
      where: { userId },
      include: {
        category: true
      },
      orderBy: { date: 'desc' }
    });

    let balance = 0;
    transactions.forEach(tx => {
      if (tx.category.type === 'income') {
        balance += tx.amount;
      } else {
        balance -= tx.amount;
      }
    });

    res.json({ user, balance, transactions });
  } catch (error) {
    console.error('Error fetching user transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

exports.getProRequests = async (req, res) => {
  try {
    const requests = await prisma.user.findMany({
      where: { proStatus: 'pending' },
      select: {
        id: true,
        name: true,
        email: true,
        proStatus: true,
        proSlipUrl: true,
        createdAt: true
      }
    });
    res.json(requests);
  } catch (error) {
    console.error('Error fetching pro requests:', error);
    res.status(500).json({ error: 'Failed to fetch pro requests' });
  }
};

exports.approveProRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { isPro: true, proStatus: 'approved' }
    });
    res.json({ message: 'Pro request approved', user });
  } catch (error) {
    console.error('Error approving pro request:', error);
    res.status(500).json({ error: 'Failed to approve pro request' });
  }
};

exports.rejectProRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { proStatus: 'none', proSlipUrl: null }
    });

    await prisma.notification.create({
      data: {
        userId: user.id,
        message: 'ท่านยังไม่ผ่านการอนุมัติเพื่อเป็นสมาชิกระดับ PRO โปรดลองใหม่อีกครั้ง'
      }
    });

    res.json({ message: 'Pro request rejected', user });
  } catch (error) {
    console.error('Error rejecting pro request:', error);
    res.status(500).json({ error: 'Failed to reject pro request' });
  }
};

exports.updateUserTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, date, title } = req.body;
    const tx = await prisma.transaction.update({
      where: { id: parseInt(id) },
      data: {
        amount: amount !== undefined ? parseFloat(amount) : undefined,
        date: date ? new Date(date) : undefined,
        title: title !== undefined ? title : undefined
      }
    });
    res.json({ message: 'Transaction updated successfully', transaction: tx });
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
};

exports.deleteUserTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.transaction.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
};
  