import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterModule } from '@angular/router';
import { LeadService } from '../../services/lead.service';
import { LogService } from '../../services/log.service';
import { LeadStats } from '../../models/lead.model';
import { LogStats } from '../../models/log.model';
import { LayoutComponent } from '../shared/layout/layout.component';

// Import chart.js modules for the dashboard
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterModule, NgChartsModule, LayoutComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  leadStats: LeadStats | null = null;
  logStats: LogStats | null = null;
  isLoading = true;
  
  // Chart configurations
  leadsBySourceChartData: ChartConfiguration['data'] = {
    datasets: [{
      data: [],
      backgroundColor: [],
    }],
    labels: []
  };
  
  leadsByStatusChartData: ChartConfiguration['data'] = {
    datasets: [{
      data: [],
      backgroundColor: [],
    }],
    labels: []
  };
  
  leadsByCountryChartData: ChartConfiguration['data'] = {
    datasets: [{
      data: [],
      backgroundColor: [],
    }],
    labels: []
  };
  
  dailyActivityChartData: ChartConfiguration['data'] = {
    datasets: [
      {
        data: [],
        label: 'New Leads',
        backgroundColor: 'rgba(52, 152, 219, 0.2)',
        borderColor: 'rgba(52, 152, 219, 1)',
        pointBackgroundColor: 'rgba(52, 152, 219, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(52, 152, 219, 1)',
        fill: true
      },
      {
        data: [],
        label: 'User Activity',
        backgroundColor: 'rgba(155, 89, 182, 0.2)',
        borderColor: 'rgba(155, 89, 182, 1)',
        pointBackgroundColor: 'rgba(155, 89, 182, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(155, 89, 182, 1)',
        fill: true
      }
    ],
    labels: []
  };
  
  chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
      }
    }
  };
  
  lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true
      }
    }
  };
  
  doughnutChartType: ChartType = 'doughnut';
  lineChartType: ChartType = 'line';
  
  constructor(
    private leadService: LeadService,
    private logService: LogService
  ) {}
  
  ngOnInit(): void {
    this.loadDashboardData();
  }
  
  private loadDashboardData(): void {
    this.isLoading = true;

    // Load lead stats
    this.leadService.getLeadStats().subscribe({
      next: (stats) => {
        this.leadStats = stats;
        this.updateLeadStatsCharts(stats);
      },
      error: (error) => {
        console.error('Error loading lead stats:', error);
      }
    });

    // Load log stats
    this.logService.getLogStats().subscribe({
      next: (stats) => {
        this.logStats = stats;
      },
      error: (error) => {
        console.error('Error loading log stats:', error);
      },
      complete: () => {
        // Reset loading state after all requests complete
        this.isLoading = false;
      }
    });
  }

  private updateLeadStatsCharts(stats: LeadStats | null): void {
    if (!stats) return;

    // Update leads by source chart
    this.leadsBySourceChartData = {
      datasets: [{
        data: Object.values(stats.bySource || {}),
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
      }],
      labels: Object.keys(stats.bySource || {})
    };

    // Update leads by status chart
    this.leadsByStatusChartData = {
      datasets: [{
        data: Object.values(stats.byStatus || {}),
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
      }],
      labels: Object.keys(stats.byStatus || {})
    };

    // Update leads by country chart
    this.leadsByCountryChartData = {
      datasets: [{
        data: Object.values(stats.byCountry || {}),
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
      }],
      labels: Object.keys(stats.byCountry || {})
    };
  }

  private setupActivityChart(): void {
    if (!this.logStats?.actionsPerDay) return;
    
    // Get the last 7 days for the x-axis
    const dates = this.getLast7Days();
    
    // Prepare data for user activity
    const activityData = dates.map(date => this.logStats?.actionsPerDay[date] ?? 0);
    
    // Mock data for new leads (in a real app, this would come from lead creation logs)
    const newLeadsData = dates.map(() => Math.floor(Math.random() * 10));
    
    this.dailyActivityChartData = {
      datasets: [
        {
          data: newLeadsData,
          label: 'New Leads',
          backgroundColor: 'rgba(52, 152, 219, 0.2)',
          borderColor: 'rgba(52, 152, 219, 1)',
          pointBackgroundColor: 'rgba(52, 152, 219, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(52, 152, 219, 1)',
          fill: true
        },
        {
          data: activityData,
          label: 'User Activity',
          backgroundColor: 'rgba(155, 89, 182, 0.2)',
          borderColor: 'rgba(155, 89, 182, 1)',
          pointBackgroundColor: 'rgba(155, 89, 182, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(155, 89, 182, 1)',
          fill: true
        }
      ],
      labels: dates.map(date => {
        const d = new Date(date);
        return `${d.getMonth() + 1}/${d.getDate()}`;
      })
    };
  }
  
  private getLast7Days(): string[] {
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }
}