import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LogService } from '../../../services/log.service';
import { UserService } from '../../../services/user.service';
import { Log, LogFilterOptions } from '../../../models/log.model';
import { User } from '../../../models/user.model';
import { AlertComponent } from '../../shared/alert/alert.component';
import { LayoutComponent } from '../../shared/layout/layout.component';

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, AlertComponent, LayoutComponent],
  templateUrl: './logs.component.html',
  styleUrls: ['./logs.component.css']
})
export class LogsComponent implements OnInit {
  logs: Log[] = [];
  filteredLogs: Log[] = [];
  users: User[] = [];
  
  filterOptions: LogFilterOptions = {
    user_id: '',
    action: '',
    entity: '',
    startDate: undefined,
    endDate: undefined
  };
  
  isLoading = false;
  showAlert = false;
  alertMessage = '';
  alertType: 'success' | 'danger' | 'info' | 'warning' = 'info';
  
  showClearConfirm = false;
  
  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalLogs = 0;
  
  // Available filters
  actionTypes = ['login', 'logout', 'create', 'update', 'delete', 'view'];
  entityTypes = ['lead', 'user', 'auth'];
  
  Math = Math;
  
  constructor(
    private logService: LogService,
    private userService: UserService
  ) {}
  
  ngOnInit(): void {
    this.loadLogs();
    this.loadUsers();
  }
  
  loadLogs(): void {
    this.isLoading = true;
    this.logService.getLogs(this.filterOptions).subscribe({
      next: (logs) => {
        this.logs = logs;
        this.filteredLogs = logs;
        this.totalLogs = logs.length;
        this.applyPagination();
        this.isLoading = false;
      },
      error: (error) => {
        this.showErrorMessage('Failed to load logs: ' + error.message);
        this.isLoading = false;
      }
    });
  }
  
  loadUsers(): void {
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
      },
      error: (error) => {
        console.error('Error loading users:', error);
      }
    });
  }
  
  applyFilters(): void {
    this.loadLogs();
  }
  
  resetFilters(): void {
    this.filterOptions = {
      user_id: '',
      action: '',
      entity: '',
      startDate: undefined,
      endDate: undefined
    };
    this.loadLogs();
  }
  
  applyPagination(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.filteredLogs = this.logs.slice(startIndex, endIndex);
  }
  
  goToPage(page: number): void {
    if (page < 1) page = 1;
    const maxPage = Math.ceil(this.totalLogs / this.pageSize);
    if (page > maxPage) page = maxPage;
    
    this.currentPage = page;
    this.applyPagination();
  }
  
  formatDate(date: Date): string {
    return new Date(date).toLocaleString();
  }
  
  getUserName(userId: string): string {
    const user = this.users.find(u => u.id === userId);
    return user ? user.username : userId;
  }
  
  getActionClass(action: string): string {
    switch (action) {
      case 'login': return 'bg-success';
      case 'logout': return 'bg-secondary';
      case 'create': return 'bg-primary';
      case 'update': return 'bg-info';
      case 'delete': return 'bg-danger';
      case 'view': return 'bg-warning';
      default: return 'bg-light';
    }
  }
  
  openClearConfirm(): void {
    this.showClearConfirm = true;
  }
  
  closeClearConfirm(): void {
    this.showClearConfirm = false;
  }
  
  clearLogs(): void {
    this.isLoading = true;
    this.logService.clearLogs().subscribe({
      next: () => {
        this.logs = [];
        this.filteredLogs = [];
        this.totalLogs = 0;
        this.isLoading = false;
        this.showClearConfirm = false;
        this.showSuccessMessage('All logs have been cleared successfully');
      },
      error: (error) => {
        this.showErrorMessage('Failed to clear logs: ' + error.message);
        this.isLoading = false;
        this.showClearConfirm = false;
      }
    });
  }
  
  exportLogs(format: 'csv' | 'excel'): void {
    // In a real application, this would call a service to export logs
    this.showSuccessMessage(`Logs exported as ${format.toUpperCase()} successfully`);
  }
  
  private showSuccessMessage(message: string): void {
    this.alertMessage = message;
    this.alertType = 'success';
    this.showAlert = true;
    
    setTimeout(() => {
      this.showAlert = false;
    }, 5000);
  }
  
  private showErrorMessage(message: string): void {
    this.alertMessage = message;
    this.alertType = 'danger';
    this.showAlert = true;
    
    setTimeout(() => {
      this.showAlert = false;
    }, 5000);
  }
}