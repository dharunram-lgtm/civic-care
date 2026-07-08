const Complaint = require('../models/Complaint');
const Department = require('../models/Department');
const { processComplaint } = require('../services/aiProcessing');
const { checkDuplicateComplaint } = require('../services/deduplication');

exports.createComplaint = async (req, res) => {
  try {
    const { description, latitude, longitude } = req.body;

    if (!description || !latitude || !longitude) {
      return res.status(400).json({ error: 'Description, latitude, and longitude are required.' });
    }

    const imageBase64 = req.file ? req.file.buffer.toString('base64') : 'mock-image-data';

    const aiResult = await processComplaint(
      Complaint,
      Department,
      description,
      imageBase64,
      parseFloat(latitude),
      parseFloat(longitude)
    );

    const duplicate = await checkDuplicateComplaint(
      Complaint,
      parseFloat(latitude),
      parseFloat(longitude),
      aiResult.aiCategory
    );

    let status = aiResult.status;
    let masterComplaintId = null;

    if (duplicate) {
      status = 'DUPLICATE';
      masterComplaintId = duplicate._id;
    }

    const imageUrl = req.file
      ? `/uploads/${req.file.filename}`
      : `/assets/mock-${aiResult.aiCategory.toLowerCase().replace(/\s+/g, '-')}.jpg`;

    const complaint = await Complaint.create({
      description,
      imageUrl,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      },
      aiCategory: aiResult.aiCategory,
      aiConfidenceScore: aiResult.aiConfidenceScore,
      priority: aiResult.priority,
      status,
      citizenId: req.user._id,
      departmentId: aiResult.departmentId,
      masterComplaintId
    });

    res.status(201).json({
      complaint,
      aiResult: {
        category: aiResult.aiCategory,
        confidence: aiResult.aiConfidenceScore,
        priority: aiResult.priority,
        priorityScore: aiResult.priorityScore,
        department: aiResult.departmentName
      },
      isDuplicate: !!duplicate,
      ticketId: complaint._id.toString().slice(-6).toUpperCase()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getComplaints = async (req, res) => {
  try {
    const { status, priority, departmentId, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (departmentId) filter.departmentId = departmentId;

    if (req.user.role === 'CITIZEN') {
      filter.citizenId = req.user._id;
    }
    if (req.user.role === 'FIELD_OFFICER' && req.user.departmentId) {
      filter.departmentId = req.user.departmentId;
    }

    const complaints = await Complaint.find(filter)
      .populate('citizenId', 'name email')
      .populate('departmentId', 'name')
      .populate('assignedOfficerId', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Complaint.countDocuments(filter);

    res.json({ complaints, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('citizenId', 'name email')
      .populate('departmentId', 'name')
      .populate('assignedOfficerId', 'name email')
      .populate('masterComplaintId');

    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    res.json({ complaint });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateComplaintStatus = async (req, res) => {
  try {
    const { status, assignedOfficerId } = req.body;
    const update = { updatedAt: Date.now() };
    if (status) update.status = status;
    if (assignedOfficerId) update.assignedOfficerId = assignedOfficerId;

    const complaint = await Complaint.findByIdAndUpdate(req.params.id, update, { new: true });

    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    res.json({ complaint });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPublicStats = async (req, res) => {
  try {
    const total = await Complaint.countDocuments();
    const resolved = await Complaint.countDocuments({ status: { $in: ['RESOLVED', 'CLOSED'] } });
    const remaining = await Complaint.countDocuments({ status: { $nin: ['RESOLVED', 'CLOSED', 'DUPLICATE'] } });
    res.json({ total, resolved, remaining });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const totalComplaints = await Complaint.countDocuments();
    const resolved = await Complaint.countDocuments({ status: { $in: ['RESOLVED', 'CLOSED'] } });
    const critical = await Complaint.countDocuments({ priority: 'CRITICAL', status: { $nin: ['RESOLVED', 'CLOSED', 'DUPLICATE'] } });
    const pending = await Complaint.countDocuments({ status: 'PENDING_AI_REVIEW' });
    const duplicated = await Complaint.countDocuments({ status: 'DUPLICATE' });

    const deptStats = await Complaint.aggregate([
      { $match: { status: { $in: ['RESOLVED', 'CLOSED'] } } },
      { $group: { _id: '$departmentId', count: { $sum: 1 } } },
      { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'dept' } },
      { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
      { $project: { department: '$dept.name', count: 1 } }
    ]);

    res.json({
      totalComplaints,
      resolved,
      critical,
      pending,
      duplicated,
      departmentStats: deptStats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
