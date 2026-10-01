const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

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
      
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        isPro: user.isPro,
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
  