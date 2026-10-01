const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.get('/users/:id/transactions', adminController.getUserTransactions);

// Pro Requests
router.get('/pro-requests', adminController.getProRequests);
router.post('/pro-requests/:id/approve', adminController.approveProRequest);
router.post('/pro-requests/:id/reject', adminController.rejectProRequest);


router.put('/transactions/:id', adminController.updateUserTransaction);
router.delete('/transactions/:id', adminController.deleteUserTransaction);

module.exports = router;
  
