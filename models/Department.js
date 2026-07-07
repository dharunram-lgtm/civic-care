const mongoose = require('mongoose');
const { Schema } = mongoose;

const DepartmentSchema = new Schema({
  name: { type: String, required: true, unique: true },
  officers: [{ type: Schema.Types.ObjectId, ref: 'User' }]
});

module.exports = mongoose.model('Department', DepartmentSchema);
