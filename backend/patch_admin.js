const fs = require('fs');

const adminRoutesPath = '/Users/tanakorn-tip/Documents/expense-tracker/backend/src/routes/adminRoutes.js';
let routesCode = fs.readFileSync(adminRoutesPath, 'utf8');

if (!routesCode.includes('/transactions/:id')) {
  routesCode = routesCode.replace('module.exports = router;', `
router.put('/transactions/:id', adminController.updateUserTransaction);
router.delete('/transactions/:id', adminController.deleteUserTransaction);

module.exports = router;
  `);
  fs.writeFileSync(adminRoutesPath, routesCode);
}

const adminControllerPath = '/Users/tanakorn-tip/Documents/expense-tracker/backend/src/controllers/adminController.js';
let controllerCode = fs.readFileSync(adminControllerPath, 'utf8');

if (!controllerCode.includes('exports.updateUserTransaction')) {
  controllerCode += `
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
  `;
  fs.writeFileSync(adminControllerPath, controllerCode);
}
console.log('Backend admin routes/controllers patched');
