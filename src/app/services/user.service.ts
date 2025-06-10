import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { User, NewUser } from '../models/user.model';
import { LogService } from './log.service';
import { throwError } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly API_URL = environment.apiUrl;
  
  constructor(
    private http: HttpClient,
    private logService: LogService
  ) {}

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.API_URL}/users`).pipe(
      catchError(error => {
        console.error('Error fetching users:', error);
        return throwError(() => new Error(error.error?.message || 'Failed to fetch users.'));
      })
    );
  }

  getUserById(id: string): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/users/${id}`).pipe(
      catchError(error => {
        console.error('Error fetching user by ID:', error);
        return throwError(() => new Error(error.error?.message || `Failed to fetch user with ID ${id}.`));
      })
    );
  }

  createUser(user: NewUser): Observable<User> {
    return this.http.post<User>(`${this.API_URL}/users`, user).pipe(
      tap(newUser => {
        this.logService.addLog({
          action: 'create',
          entity: 'user',
          entity_id: newUser.id,
          details: `Created user ${newUser.username}`
        }).subscribe();
      }),
      catchError(error => {
        console.error('Error creating user:', error);
        return throwError(() => new Error(error.error?.message || 'Failed to create user.'));
      })
    );
  }

  updateUser(user: User): Observable<User> {
    return this.http.put<User>(`${this.API_URL}/users/${user.id}`, user).pipe(
      tap(updatedUser => {
        this.logService.addLog({
          action: 'update',
          entity: 'user',
          entity_id: updatedUser.id,
          details: `Updated user ${updatedUser.username}`
        }).subscribe();
      }),
      catchError(error => {
        console.error('Error updating user:', error);
        return throwError(() => new Error(error.error?.message || 'Failed to update user.'));
      })
    );
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/users/${id}`).pipe(
      tap(() => {
        this.logService.addLog({
          action: 'delete',
          entity: 'user',
          entity_id: id,
          details: `Deleted user with ID ${id}`
        }).subscribe();
      }),
      catchError(error => {
        console.error('Error deleting user:', error);
        return throwError(() => new Error(error.error?.message || `Failed to delete user with ID ${id}.`));
      })
    );
  }

  resetUserPassword(id: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.API_URL}/users/${id}/reset-password`, {}).pipe(
      tap(() => {
        this.logService.addLog({
          action: 'reset_password',
          entity: 'user',
          entity_id: id,
          details: `Initiated password reset for user ID ${id}`
        }).subscribe();
      }),
      catchError(error => {
        console.error('Error resetting user password:', error);
        return throwError(() => new Error(error.error?.message || `Failed to reset password for user ID ${id}.`));
      })
    );
  }
}