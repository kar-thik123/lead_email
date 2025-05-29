import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { User, UserCredentials, ResetPasswordRequest, ResetPasswordConfirm } from '../models/user.model';
import { LogService } from './log.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = 'http://localhost:3000/api'; // Replace with actual API URL
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'current_user';
  
  currentUser = signal<User | null>(null);
  isLoggedIn = signal<boolean>(false);

  constructor(
    private http: HttpClient,
    private router: Router,
    private logService: LogService
  ) {
    this.checkAuthStatus();
  }

  getToken(): string | null {
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (token) {
      return token;
    }
    return null;
  }

  private checkAuthStatus(): void {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const userJson = localStorage.getItem(this.USER_KEY);
    
    if (token && userJson) {
      try {
        const user: User = JSON.parse(userJson);
        this.currentUser.set(user);
        this.isLoggedIn.set(true);
      } catch (e) {
        this.logout();
      }
    }
  }

  login(credentials: UserCredentials): Observable<{ token: string; user: User }> {
    return this.http.post<{ token: string; user: User }>(`${this.API_URL}/login`, credentials).pipe(
      tap(response => {
        localStorage.setItem(this.TOKEN_KEY, response.token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
        this.currentUser.set(response.user);
        this.isLoggedIn.set(true);
        this.logService.addLog({
          action: 'login',
          entity: 'auth',
          entity_id: response.user.id,
          details: `User logged in: ${response.user.username}`
        });
      }),
      catchError(error => {
        console.error('Login error:', error);
        return throwError(() => new Error(error.error?.message || 'Invalid credentials. Please try again.'));
      })
    );
  }

  logout(): void {
    // Log the logout action before clearing user data
    const user = this.currentUser();
    if (user) {
      this.logService.addLog({
        action: 'logout',
        entity: 'auth',
        entity_id: user.id,
        details: `User logged out: ${user.username}`
      }).subscribe();
    }

    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
    this.isLoggedIn.set(false);
    this.router.navigate(['/auth/login']);
  }

  requestPasswordReset(request: ResetPasswordRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.API_URL}/auth/reset-password`, request).pipe(
      catchError(error => {
        console.error('Password reset request error:', error);
        return throwError(() => new Error(error.error?.message || 'Failed to process password reset request. Please try again.'));
      })
    );
  }

  confirmPasswordReset(data: ResetPasswordConfirm): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.API_URL}/auth/reset-password/confirm`, data).pipe(
      catchError(error => {
        console.error('Password reset confirmation error:', error);
        return throwError(() => new Error(error.error?.message || 'Failed to reset password. Please try again.'));
      })
    );
  }

  isAdmin(): boolean {
    return this.currentUser()?.role === 'admin';
  }

  getAuthToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }
}