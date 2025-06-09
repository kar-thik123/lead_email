export interface User {
  id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: 'admin' | 'user';
  created_at: Date;
  last_login?: Date;
  status: 'active' | 'inactive';
}

export interface NewUser extends Omit<User, 'id' | 'created_at' | 'last_login'> {
  password: string;
}

export interface UserCredentials {
  email: string;
  password: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface ResetPasswordConfirm {
  token: string;
  password: string;
  confirmPassword: string;
}