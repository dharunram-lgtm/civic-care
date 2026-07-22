const mongoose = require('../../backend/node_modules/mongoose');
const { Schema } = mongoose;

const ComplaintSchema = new Schema({
  title: { type: String },
  description: { type: String, required: true },
  imageUrl: { type: String, required: true },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  aiCategory: { type: String, default: null },
  aiConfidenceScore: { type: Number, default: null },
  priority: {
    type: String,
    enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
    default: null
  },
  status: {
    type: String,
    enum: [
      'PENDING_AI_REVIEW',
      'PENDING_ADMIN_REVIEW',
      'ROUTED',
      'ACCEPTED',
      'IN_PROGRESS',
      'RESOLVED',
      'CLOSED',
      'DUPLICATE'
    ],
    default: 'PENDING_AI_REVIEW'
  },
  citizenId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
  assignedOfficerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  masterComplaintId: { type: Schema.Types.ObjectId, ref: 'Complaint', default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ComplaintSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Complaint', ComplaintSchema);
