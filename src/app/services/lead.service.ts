import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timeout } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Lead, LeadFilterOptions, LeadStats, NewLead } from '../models/lead.model';
import { LogService } from './log.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class LeadService {
  private readonly API_URL = 'http://localhost:3000/api'; // Replace with actual API URL
  private readonly TIMEOUT = 30000; // 30 seconds timeout

  constructor(
    private http: HttpClient,
    private logService: LogService,
    private authService: AuthService,
  ) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  private addTimeout<T>(observable: Observable<T>): Observable<T> {
    return observable.pipe(
      timeout(this.TIMEOUT),
      catchError(error => {
        console.error('Request timed out:', error);
        return throwError(() => new Error('Request timed out. Please try again.'));
      })
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred';
    if (error.error instanceof ErrorEvent) {
      errorMessage = error.error.message;
    } else {
      errorMessage = error.error?.message || error.message;
    }
    console.error('API Error:', error);
    return throwError(() => new Error(errorMessage));
  }

  getLeads(filters?: LeadFilterOptions): Observable<Lead[]> {
    const options = {
      headers: this.getHeaders(),
      params: filters as any
    };
  
    return this.http.get<Lead[]>(`${this.API_URL}/leads`, options).pipe(
      catchError(this.handleError)
    );
  }
  

  getLeadById(id: string): Observable<Lead> {
    return this.addTimeout(this.http.get<Lead>(`${this.API_URL}/leads/${id}`)).pipe(
      catchError(this.handleError)
    );
  }

  addLead(lead: NewLead): Observable<Lead> {
    // Format the follow_up date if it exists
    const formattedLead = {
      ...lead,
      follow_up: lead['follow_up'] ? new Date(lead['follow_up']).toISOString().split('T')[0] : null
    };

    return this.http.post<Lead>(`${this.API_URL}/leads`, formattedLead, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  updateLead(lead: Lead): Observable<Lead> {
    console.log('Updating lead with data:', lead);
    console.log('Status value:', lead.status);
    
    return this.addTimeout(this.http.put<Lead>(`${this.API_URL}/leads/${lead.id}`, lead)).pipe(
      tap(updatedLead => {
        console.log('Lead updated successfully:', updatedLead);
        console.log('Updated status:', updatedLead.status);
        
        this.logService.addLog({
          action: 'update',
          entity: 'lead',
          entity_id: lead.id,
          details: `Updated lead for ${updatedLead.first_name} ${updatedLead.last_name || ''}`
        }).subscribe();
      }),
      catchError(this.handleError)
    );
  }

  deleteLead(id: string): Observable<void> {
    return this.addTimeout(this.http.delete<void>(`${this.API_URL}/leads/${id}`)).pipe(
      tap(() => {
        this.logService.addLog({
          action: 'delete',
          entity: 'lead',
          entity_id: id,
          details: `Deleted lead with ID ${id}`
        }).subscribe();
      }),
      catchError(this.handleError)
    );
  }

  deleteMultipleLeads(data: { ids: string[] }): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/leads/delete-multiple`, data).pipe(
      catchError(this.handleError)
    );
  }

  bulkAddLeads(leads: NewLead[]): Observable<Lead[]> {
    return this.addTimeout(this.http.post<Lead[]>(`${this.API_URL}/leads/bulk`, leads)).pipe(
      tap((addedLeads) => {
        this.logService.addLog({
          action: 'create',
          entity: 'lead',
          entity_id: addedLeads[0]?.id || 'bulk', // Use first lead ID or 'bulk' as fallback
          details: `Bulk imported ${addedLeads.length} leads`
        }).subscribe();
      }),
      catchError(this.handleError)
    );
  }

  importLeads(file: File): Observable<{ count: number, skipped: number }> {
    const formData = new FormData();
    formData.append('file', file);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    });

    return this.http.post<{ count: number, skipped: number }>(
      `${this.API_URL}/leads/import`, 
      formData,
      { headers }
    ).pipe(
      catchError(this.handleError)
    );
  }

  checkDuplicates(file: File): Observable<{
    duplicates: Array<{ new: any, existing: any }>,
    nonDuplicates: any[],
    totalDuplicates: number,
    totalNonDuplicates: number
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    });

    return this.http.post<{
      duplicates: Array<{ new: any, existing: any }>,
      nonDuplicates: any[],
      totalDuplicates: number,
      totalNonDuplicates: number
    }>(
      `${this.API_URL}/leads/import?checkOnly=true`, 
      formData,
      { headers }
    ).pipe(
      catchError(this.handleError)
    );
  }

  importLeadsWithOptions(file: File, skipDuplicates: boolean): Observable<{ count: number, skipped: number }> {
    const formData = new FormData();
    formData.append('file', file);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    });

    return this.http.post<{ count: number, skipped: number }>(
      `${this.API_URL}/leads/import?skipDuplicates=${skipDuplicates}`, 
      formData,
      { headers }
    ).pipe(
      catchError(this.handleError)
    );
  }

  clearAllLeads(): Observable<any> {
    console.log('Starting clearAllLeads request');
    console.log('API URL:', this.API_URL);
    
    return this.http.delete(`${this.API_URL}/leads/clear-all`).pipe(
      timeout(120000), // 2 minutes
      tap({
        next: (response) => {
          console.log('Clear all leads response:', response);
        },
        error: (error) => {
          console.error('Clear all leads error:', error);
          console.error('Error stack:', error.stack);
        }
      }),
      catchError(this.handleError)
    );
  }

  getLeadStats(): Observable<LeadStats> {
    return this.addTimeout(this.http.get<LeadStats>(`${this.API_URL}/leads/stats`)).pipe(
      catchError(this.handleError)
    );
  }

  getActivityTrends(): Observable<any> {
    return this.addTimeout(this.http.get<any>(`${this.API_URL}/leads/activity-trends`)).pipe(
      catchError(this.handleError)
    );
  }

  getStatusDistribution(): Observable<any> {
    return this.addTimeout(this.http.get<any>(`${this.API_URL}/leads/status-distribution`)).pipe(
      catchError(this.handleError)
    );
  }

  getSourceDistribution(): Observable<any> {
    return this.addTimeout(this.http.get<any>(`${this.API_URL}/leads/source-distribution`)).pipe(
      catchError(this.handleError)
    );
  }

  getCountryDistribution(): Observable<any> {
    return this.addTimeout(this.http.get<any>(`${this.API_URL}/leads/country-distribution`)).pipe(
      catchError(this.handleError)
    );
  }

  // findDuplicateLeads(): Observable<Lead[][]> {
  //   return this.addTimeout(this.http.get<Lead[][]>(`${this.API_URL}/leads/duplicates`)).pipe(
  //     catchError(this.handleError)
  //   );
  // }

  exportLeads(): Observable<Blob> {
    return this.http.get(`${this.API_URL}/leads/export`, {
      responseType: 'blob',
      headers: new HttpHeaders({
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      })
    }).pipe(
      catchError(error => {
        console.error('Export error:', error);
        return throwError(() => new Error('Failed to export leads'));
      })
    );
  }

  scanDuplicates(): Observable<{
    success: boolean;
    totalGroups: number;
    totalDuplicates: number;
    duplicateGroups: any[];
  }> {
    // Use a longer timeout for duplicate scanning (2 minutes)
    return this.http.get<{
      success: boolean;
      totalGroups: number;
      totalDuplicates: number;
      duplicateGroups: any[];
    }>(`${this.API_URL}/leads/scan-duplicates`, {
      headers: this.getHeaders()
    }).pipe(
      timeout(120000), // 2 minutes timeout
      catchError(error => {
        if (error.name === 'TimeoutError') {
          console.error('Duplicate scan timed out:', error);
          return throwError(() => new Error('Duplicate scan is taking longer than expected. Please try again.'));
        }
        return this.handleError(error);
      })
    );
  }

  removeDuplicates(): Observable<{
    success: boolean;
    message: string;
    removedCount: number;
  }> {
    return this.http.delete<{
      success: boolean;
      message: string;
      removedCount: number;
    }>(`${this.API_URL}/leads/remove-duplicates`, {
      headers: this.getHeaders()
    }).pipe(
      timeout(120000),
      catchError(error => {
        if (error.name === 'TimeoutError') {
          console.error('Timeout while removing duplicates');
          return throwError(() => new Error('Operation timed out. Please try again.'));
        }
        console.error('Error removing duplicates:', error);
        return throwError(() => error);
      }),
      tap(result => {
        if (result.success) {
          // Log the action with all required fields
          this.logService.addLog({
            action: 'delete_duplicates',
            entity: 'lead',
            entity_id: 'system', // Using 'system' since this is a bulk operation
            details: `Removed ${result.removedCount} duplicate leads`
          });
        }
      })
    );
  }
}