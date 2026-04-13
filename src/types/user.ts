export type Gender = 'male' | 'female' | 'other';
export type PrivacyStatus = 'ALL' | 'FRIEND' | 'PRIVATE';

export interface IUser {
  _id: string;
  phone: string;
  email: string;
  fullName: string;
  avatar?: string;
  coverImage?: string;
  dob?: Date;
  gender: Gender;
  bio?: string;
  status: {
    isOnline: boolean;
    lastSeen: Date;
  };
  privacy: {
    showPhone: PrivacyStatus;
    showOnline: boolean;
    allowStrangerMessage: boolean;
    findByPhone: boolean;
  };
  settings: {
    darkMode: boolean;
    language: 'vi' | 'en';
    twoFactorAuth: boolean;
  };
  fcmTokens: string[];
  isVerified: boolean;
  isBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}