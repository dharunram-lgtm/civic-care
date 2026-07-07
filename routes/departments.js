const express = require('express');
const router = express.Router();
const departmentsController = require('../controllers/departmentsController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, departmentsController.getDepartments);
router.post('/', authenticate, authorize('ADMIN'), departmentsController.createDepartment);

module.exports = router;
