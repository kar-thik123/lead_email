import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { User, UserCredentials, ResetPasswordRequest } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'token';
  private readonly USER_KEY = 'current_user';
  private readonly API_URL = environment.apiUrl;

  currentUser = signal<User | null>(null);
  isLoggedIn = signal<boolean>(false);

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.checkAuthStatus();
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

  login(credentials: UserCredentials): Observable<any> {
    return this.http.post(`${this.API_URL}/login`, credentials)
      .pipe(
        tap((response: any) => {
          if (response.token) {
            localStorage.setItem(this.TOKEN_KEY, response.token);
            if (response.user) {
              localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
              this.currentUser.set(response.user);
              this.isLoggedIn.set(true);
            }
          }
        })
      );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
    this.isLoggedIn.set(false);
    this.router.navigate(['/auth/login']);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem(this.TOKEN_KEY);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isAdmin(): boolean {
    return this.currentUser()?.role === 'admin';
  }

  requestPasswordReset(request: ResetPasswordRequest): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/forgot-password`, request);
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/reset-password`, {
      token,
      newPassword
    });
  }
}