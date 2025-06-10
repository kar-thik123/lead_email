import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Log, LogFilterOptions, LogStats, LogCreation } from '../models/log.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LogService {
  private readonly API_URL = environment.apiUrl;
  
  constructor(
    private http: HttpClient,
    
  ) {}

  getLogs(filters?: LogFilterOptions): Observable<Log[]> {
    // Filter out undefined or empty values from the parameters
    const cleanParams: Record<string, string> = {};
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          cleanParams[key] = value;
        }
      });
    }

    return this.http.get<Log[]>(`${this.API_URL}/logs`, { params: cleanParams }).pipe(
      catchError(error => {
        console.error('Error fetching logs:', error);
        return throwError(() => new Error(error.error?.message || 'Failed to fetch logs.'));
      })
    );
  }

  getLogStats(): Observable<LogStats> {
    
    return this.http.get<LogStats>(`${this.API_URL}/logs/stats`).pipe(
      catchError(error => {
        console.error('Error fetching log stats:', error);
        return throwError(() => new Error(error.error?.message || 'Failed to fetch log stats.'));
      })
    );
  }
 
  

  addLog(logData: LogCreation): Observable<Log> {
    const log: LogCreation = {
      ...logData
    };
    
    // Validate required fields based on action type
    if (!log.action || !log.entity || !log.details) {
      throw new Error('Missing required fields: action, entity, and details are required');
    }
    
    // entity_id is required for actions on a specific entity
    const actionsRequiringEntityId = ['create', 'update', 'delete', 'reset_password', 'status_change', 'view'];
    if (actionsRequiringEntityId.includes(log.action) && !log.entity_id) {
      throw new Error(`Missing required field: entity_id is required for action '${log.action}'`);
    }
    
    return this.http.post<Log>(`${this.API_URL}/logs`, log).pipe(
      catchError(error => {
        console.error('Error adding log:', error);
        return throwError(() => new Error(error.error?.message || 'Failed to add log.'));
      })
    );
  }

  clearLogs(): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/logs`).pipe(
      catchError(error => {
        console.error('Error clearing logs:', error);
        return throwError(() => new Error(error.error?.message || 'Failed to clear logs.'));
      })
    );
  }

  exportLogs(format: 'csv' | 'excel', filters?: LogFilterOptions): Observable<Blob> {
    const cleanParams: Record<string, string> = { format };
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          cleanParams[key] = value;
        }
      });
    }

    return this.http.get(`${this.API_URL}/logs/export`, {
      params: cleanParams,
      responseType: 'blob'
    }).pipe(
      catchError(error => {
        console.error('Error exporting logs:', error);
        return throwError(() => new Error(error.error?.message || 'Failed to export logs.'));
      })
    );
  }
}