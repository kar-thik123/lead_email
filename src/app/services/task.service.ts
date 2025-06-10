import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Task } from '../models/task.model';
import * as XLSX from 'xlsx';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private apiUrl = `${environment.apiUrl}/tasks`;

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    });
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred';
    if (error.error instanceof ErrorEvent) {
      errorMessage = error.error.message;
    } else {
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    console.error(errorMessage);
    return throwError(() => errorMessage);
  }

  getTasks(): Observable<Task[]> {
    return this.http.get<any[]>(this.apiUrl, { headers: this.getHeaders() })
      .pipe(
        map(tasks => tasks.map(task => ({
          id: task.id,
          dateFrom: task.date_from ? new Date(task.date_from) : null,
          dateTo: task.date_to ? new Date(task.date_to) : null,
          description: task.description,
          status: task.status,
          remark: task.remark
        }))),
        catchError(this.handleError)
      );
  }

  addTask(task: Task): Observable<Task> {
    const taskData = {
      date_from: task.dateFrom ? task.dateFrom.toISOString() : null,
      date_to: task.dateTo ? task.dateTo.toISOString() : null,
      description: task.description || null,
      status: task.status || null,
      remark: task.remark || null
    };
    return this.http.post<any>(this.apiUrl, taskData, { headers: this.getHeaders() })
      .pipe(
        map(response => ({
          id: response.id,
          dateFrom: response.date_from ? new Date(response.date_from) : null,
          dateTo: response.date_to ? new Date(response.date_to) : null,
          description: response.description,
          status: response.status,
          remark: response.remark
        })),
        catchError(this.handleError)
      );
  }

  updateTask(task: Task): Observable<Task> {
    const taskData = {
      date_from: task.dateFrom ? task.dateFrom.toISOString() : null,
      date_to: task.dateTo ? task.dateTo.toISOString() : null,
      description: task.description || null,
      status: task.status || null,
      remark: task.remark || null
    };
    return this.http.put<any>(`${this.apiUrl}/${task.id}`, taskData, { headers: this.getHeaders() })
      .pipe(
        map(response => ({
          id: response.id,
          dateFrom: response.date_from ? new Date(response.date_from) : null,
          dateTo: response.date_to ? new Date(response.date_to) : null,
          description: response.description,
          status: response.status,
          remark: response.remark
        })),
        catchError(this.handleError)
      );
  }

  deleteTask(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  exportToExcel(tasks: Task[]): void {
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(tasks);
    const workbook: XLSX.WorkBook = { Sheets: { 'Tasks': worksheet }, SheetNames: ['Tasks'] };
    XLSX.writeFile(workbook, 'tasks.xlsx');
  }

  importFromExcel(file: File): Promise<Task[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawTasks = XLSX.utils.sheet_to_json(worksheet);
          
          // Transform the data to match the Task interface
          const tasks: Task[] = rawTasks.map((task: any) => {
            // Helper function to check if a value is empty
            const isEmpty = (value: any) => {
              return value === undefined || value === null || value === '' || value === 'null' || value === 'NULL';
            };

            // Parse date if it exists and is not empty
            const parseDate = (dateStr: any) => {
              if (isEmpty(dateStr)) return null;
              const date = new Date(dateStr);
              return isNaN(date.getTime()) ? null : date;
            };

            // Validate status against allowed values
            const validateStatus = (status: string | null): "Pending" | "In Progress" | "Completed" | null => {
              if (isEmpty(status)) return null;
              const validStatuses = ["Pending", "In Progress", "Completed"];
              return validStatuses.includes(String(status)) ? String(status) as "Pending" | "In Progress" | "Completed" : null;
            };

            return {
              dateFrom: parseDate(task['Date From']),
              dateTo: parseDate(task['Date To']),
              description: isEmpty(task['Task Description']) ? null : String(task['Task Description']),
              status: validateStatus(task['Status']),
              remark: isEmpty(task['Remark']) ? null : String(task['Remark'])
            };
          });
          
          resolve(tasks);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  }
} 