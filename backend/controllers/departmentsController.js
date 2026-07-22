const Department = require('../../database/models/Department');

exports.getDepartments = async (req, res) => {
  try {
    const departments = await Department.find().populate('officers', 'name email');
    res.json({ departments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createDepartment = async (req, res) => {
  try {
    const { name } = req.body;
    const dept = await Department.create({ name });
    res.status(201).json({ department: dept });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
