import mongoose, { Document, Schema } from 'mongoose';

export interface IProperty extends Document {
  title: string;
  description: string;
  rent: number;
  location: string;
  image: string;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PropertySchema: Schema = new Schema({
  title: {
    type: String,
    required: [true, 'Property title is required'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Property description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  rent: {
    type: Number,
    required: [true, 'Rent amount is required'],
    min: [0, 'Rent cannot be negative']
  },
  location: {
    type: String,
    required: [true, 'Property location is required'],
    trim: true,
    maxlength: [200, 'Location cannot be more than 200 characters']
  },
  image: {
    type: String,
    required: [true, 'Property image is required'],
    trim: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Prevent re-compilation during development
export default mongoose.models.Property || mongoose.model<IProperty>('Property', PropertySchema);

