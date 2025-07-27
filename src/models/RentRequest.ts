import mongoose, { Document, Schema } from 'mongoose';

export interface IRentRequest extends Document {
  userId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  userName: string;
  userPhone: string;
  propertyTitle: string;
  status: 'pending' | 'contacted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

const RentRequestSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  propertyId: {
    type: Schema.Types.ObjectId,
    ref: 'Property',
    required: [true, 'Property ID is required']
  },
  userName: {
    type: String,
    required: [true, 'User name is required'],
    trim: true
  },
  userPhone: {
    type: String,
    required: [true, 'User phone is required'],
    trim: true
  },
  propertyTitle: {
    type: String,
    required: [true, 'Property title is required'],
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'contacted', 'rejected'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Prevent re-compilation during development
export default mongoose.models.RentRequest || mongoose.model<IRentRequest>('RentRequest', RentRequestSchema);

