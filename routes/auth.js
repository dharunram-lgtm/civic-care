const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authenticate, authController.getMe);
router.put('/profile', authenticate, authController.updateProfile);
router.get('/users', authenticate, authorize('ADMIN'), authController.getUsers);
router.post('/users', authenticate, authorize('ADMIN'), authController.createUser);

module.exports = router;
