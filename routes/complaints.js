const express = require('express');
const router = express.Router();
const multer = require('multer');
const complaintsController = require('../controllers/complaintsController');
const { authenticate, authorize } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/', authenticate, upload.single('image'), complaintsController.createComplaint);
router.get('/', authenticate, complaintsController.getComplaints);
router.get('/stats', authenticate, complaintsController.getStats);
router.get('/:id', authenticate, complaintsController.getComplaintById);
router.patch('/:id/status', authenticate, authorize('FIELD_OFFICER', 'DEPT_HEAD', 'ADMIN'), complaintsController.updateComplaintStatus);

module.exports = router;
