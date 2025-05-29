import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timeout } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Lead, LeadFilterOptions, LeadStats, NewLead } from '../models/lead.model';
import { LogService } from './log.service';

@Injectable({
  providedIn: 'root'
})
export class LeadService {
  private readonly API_URL = 'http://localhost:3000/api'; // Replace with actual API URL
  private readonly TIMEOUT = 30000; // 30 seconds timeout

  constructor(
    private http: HttpClient,
    private logService: LogService,
  ) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
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
    return this.addTimeout(this.http.put<Lead>(`${this.API_URL}/leads/${lead.id}`, lead)).pipe(
      tap(updatedLead => {
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

  importLeads(file: File): Observable<{ count: number }> {
    const formData = new FormData();
    formData.append('file', file);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    });

    return this.http.post<{ count: number }>(
      `${this.API_URL}/leads/import`, 
      formData,
      { headers }
    ).pipe(
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

  findDuplicateLeads(): Observable<Lead[][]> {
    return this.addTimeout(this.http.get<Lead[][]>(`${this.API_URL}/leads/duplicates`)).pipe(
      catchError(this.handleError)
    );
  }

  exportLeads(): Observable<Blob> {
    return this.http.get(`${this.API_URL}/leads/export`, {
      responseType: 'blob',
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      })
    }).pipe(
      catchError(this.handleError)
    );
  }

  removeDuplicates(): Observable<{ removed: number; duplicates: Lead[] }> {
    return this.addTimeout(this.http.delete<{ removed: number; duplicates: Lead[] }>(`${this.API_URL}/leads/remove-duplicates`)).pipe(
      tap(response => {
        if (response.removed > 0) {
          this.logService.addLog({
            action: 'remove_duplicates',
            entity: 'lead',
            entity_id: undefined,
            details: `Removed ${response.removed} duplicate leads`
          }).subscribe();
        }
      }),
      catchError(this.handleError)
    );
  }
}