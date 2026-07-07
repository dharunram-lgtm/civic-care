const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: {
    type: String,
    enum: ['CITIZEN', 'FIELD_OFFICER', 'DEPT_HEAD', 'ADMIN'],
    default: 'CITIZEN'
  },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
