const transactionRepository = require('../repositories/transactionRepository');
const prisma = require('../db/prisma');

const transactionService = {
  async getTransactions(filters) {
    let where = { userId: filters.userId };
    
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { subtitle: { contains: filters.search, mode: 'insensitive' } },
        { category: { name: { contains: filters.search, mode: 'insensitive' } } }
      ];
    }
    
    if (filters.categoryId) where.categoryId = parseInt(filters.categoryId);
    if (filters.type) where.category = { type: filters.type };

    return await transactionRepository.findAll(where);
  },

  async createTransaction(data, userId) {
    let category = await prisma.category.findFirst({
      where: { name: data.categoryName }
    });

    if (!category && data.categoryName) {
      category = await prisma.category.create({
        data: {
          name: data.categoryName,
          type: data.type === 'income' ? 'income' : 'expense'
        }
      });
    }

    if (!category) throw new Error("Category not found");

    return await transactionRepository.create({
      title: data.title,
      subtitle: data.subtitle || category.name,
      amount: parseFloat(data.amount),
      date: data.date ? new Date(data.date) : new Date(),
      userId: userId,
      categoryId: category.id
    });
  },

  async getStats(userId, filters = {}) {
    const transactions = await transactionRepository.findAll({ userId });
    
    // Total historical sum
    const totalIncomeAll = transactions.filter(t => t.category.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpensesAll = transactions.filter(t => t.category.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const totalBalance = totalIncomeAll - totalExpensesAll;

    // Filter by month/year if provided
    const targetMonth = filters.month !== undefined ? parseInt(filters.month) : new Date().getMonth();
    const targetYear = filters.year !== undefined ? parseInt(filters.year) : new Date().getFullYear();

    const thisMonthTransactions = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    });

    const monthlyIncome = thisMonthTransactions.filter(t => t.category.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const monthlyExpenses = thisMonthTransactions.filter(t => t.category.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    return {
      totalBalance,
      monthlyIncome,
      monthlyExpenses,
      monthlyBalance: monthlyIncome - monthlyExpenses,
      incomeTargetReached: Math.min(Math.round((monthlyIncome / (totalIncomeAll > 0 ? 15000 : 1)) * 100), 100) || 0,
      expenseBudgetStatus: monthlyExpenses > 0 ? Math.round(((monthlyExpenses - 5000) / 5000) * 100) : 0
    };
  }
};

module.exports = transactionService;
