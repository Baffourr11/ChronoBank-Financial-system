export interface IUser {
  _id?: string;
  email: string;
  fullName: string;
  passwordHash: string;
  createdAt: Date;
  preferences: {
    currency: string;
    timezone: string;
    theme: string;
  };
}
