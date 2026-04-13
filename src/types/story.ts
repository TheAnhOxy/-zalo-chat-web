export interface IStory {
  _id: string;
  userId: string;
  mediaUrl: string;
  type: 'IMAGE' | 'VIDEO';
  caption?: string;
  viewers: string[];
  expiresAt: Date;
  createdAt: Date;
}