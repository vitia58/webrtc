import { Schema, model, Document } from 'mongoose';

interface IRoom extends Document {
  name: string;
  usersCount: number;
}

const roomSchema = new Schema<IRoom>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  usersCount: {
    type: Number,
    default: 0,
  },
});

const Room = model<IRoom>('Room', roomSchema);

export default Room;
