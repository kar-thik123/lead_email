import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UserService } from '../../../services/user.service';
import { LogService } from '../../../services/log.service';
import { User } from '../../../models/user.model';
import { Log } from '../../../models/log.model';
import { LayoutComponent } from '../../shared/layout/layout.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, LayoutComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  recentUsers: User[] = [];
  recentLogs: Log[] = [];
  activeUsers = 0;
  inactiveUsers = 0;
  totalLogs = 0;
  isLoading = true;
  
  constructor(
    private userService: UserService,
    private logService: LogService
  ) {}
  
  ngOnInit(): void {
    this.loadAdminDashboardData();
  }
  
  private loadAdminDashboardData(): void {
    this.isLoading = true;
    
    // Load users
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.recentUsers = users.slice(0, 5);
        this.activeUsers = users.filter(user => user.status === 'active').length;
        this.inactiveUsers = users.filter(user => user.status === 'inactive').length;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.isLoading = false;
      }
    });
    
    // Load logs
    this.logService.getLogs().subscribe({
      next: (logs) => {
        this.recentLogs = logs.slice(0, 10);
        this.totalLogs = logs.length;
      },
      error: (error) => {
        console.error('Error loading logs:', error);
      }
    });
  }
  
  formatDate(date: Date): string {
    return new Date(date).toLocaleString();
  }

  getActionClass(action: string): string {
    switch (action) {
      case 'created':
        return 'text-success';
      case 'updated':
        return 'text-warning';
      case 'deleted':
        return 'text-danger';
      default:
        return '';
    }
  }
}