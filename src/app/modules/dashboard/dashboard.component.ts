import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
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
import { registerables } from 'chart.js';
import { Chart } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterModule, NgChartsModule, LayoutComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('chartsContainer') chartsContainer!: ElementRef;
  private resizeObserver: ResizeObserver | null = null;
  
  leadStats: LeadStats | null = null;
  logStats: LogStats | null = null;
  isLoading = true;
  lastUpdated: Date | null = null;
  
  // Chart configurations
  doughnutChartType: ChartType = 'doughnut';
  barChartType: ChartType = 'bar';
  lineChartType: ChartType = 'line';
  
  leadsBySourceChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: ['#3498db', '#2ecc71', '#e74c3c', '#f1c40f', '#9b59b6'],
      borderWidth: 0
    }]
  };
  
  leadsByStatusChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: ['#3498db', '#2ecc71', '#e74c3c', '#f1c40f', '#9b59b6'],
      borderWidth: 0
    }]
  };

  leadsByCountryChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: ['#3498db', '#2ecc71', '#e74c3c', '#f1c40f', '#9b59b6'],
      borderWidth: 0
    }]
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
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      }
    }
  };
  
  lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => `${value}%`
        }
      }
    }
  };
  
  barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };
  
  // New chart data
  conversionRateChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [{
      data: [],
      label: 'Conversion Rate',
      borderColor: '#3498db',
      backgroundColor: 'rgba(52, 152, 219, 0.1)',
      fill: true,
      tension: 0.4
    }]
  };

  leadActivityChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'New Leads',
        backgroundColor: '#3498db'
      },
      {
        data: [],
        label: 'Follow-ups',
        backgroundColor: '#2ecc71'
      }
    ]
  };

  // Additional metrics
  conversionRate = 0;
  averageResponseTime = 0;
  topPerformingSources: { source: string; count: number }[] = [];
  recentActivities: { type: string; count: number; date: Date }[] = [];
  
  constructor(
    private leadService: LeadService,
    private logService: LogService
  ) {}
  
  ngOnInit(): void {
    this.loadDashboardData();
  }
  
  ngAfterViewInit() {
    // Initialize resize observer
    this.resizeObserver = new ResizeObserver(() => {
      // Force chart update when container size changes
      this.updateCharts();
    });

    // Observe the charts container
    if (this.chartsContainer) {
      this.resizeObserver.observe(this.chartsContainer.nativeElement);
    }
  }

  ngOnDestroy() {
    // Clean up resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }
  
  private loadDashboardData(): void {
    this.isLoading = true;
    console.log('Loading dashboard data...');

    this.leadService.getLeadStats().subscribe({
      next: (stats) => {
        console.log('Received lead stats:', stats);
        this.leadStats = stats;
        this.lastUpdated = new Date();
        this.updateCharts();
        this.calculateAdditionalMetrics();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.isLoading = false;
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

  private updateCharts(): void {
    if (!this.leadStats) {
      console.log('No lead stats available');
      return;
    }

    console.log('Updating charts with data:', this.leadStats);

    // Update existing charts with a slight delay to ensure container dimensions are ready
    setTimeout(() => {
      const { byStatus, bySource, byCountry } = this.leadStats!;

      // Update existing charts
      this.leadsByStatusChartData = {
        ...this.leadsByStatusChartData,
        labels: Object.keys(byStatus || {}),
        datasets: [{
          ...this.leadsByStatusChartData.datasets[0],
          data: Object.values(byStatus || {})
        }]
      };

      this.leadsBySourceChartData = {
        ...this.leadsBySourceChartData,
        labels: Object.keys(bySource || {}),
        datasets: [{
          ...this.leadsBySourceChartData.datasets[0],
          data: Object.values(bySource || {})
        }]
      };

      this.leadsByCountryChartData = {
        ...this.leadsByCountryChartData,
        labels: Object.keys(byCountry || {}),
        datasets: [{
          ...this.leadsByCountryChartData.datasets[0],
          data: Object.values(byCountry || {})
        }]
      };

      // Update new charts
      this.updateConversionRateChart();
      this.updateLeadActivityChart();
    }, 0);
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

  updateConversionRateChart() {
    if (!this.leadStats) return;

    const conversionHistory = this.leadStats.conversionHistory || [];
    console.log('Updating conversion rate chart with:', conversionHistory);

    this.conversionRateChartData = {
      labels: conversionHistory.map(item => item.month),
      datasets: [{
        data: conversionHistory.map(item => item.rate),
        label: 'Conversion Rate',
        borderColor: '#3498db',
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        fill: true,
        tension: 0.4
      }]
    };
  }

  updateLeadActivityChart() {
    if (!this.leadStats) return;

    const weeklyActivity = this.leadStats.weeklyActivity || [];
    console.log('Updating lead activity chart with:', weeklyActivity);

    this.leadActivityChartData = {
      labels: weeklyActivity.map(item => item.day),
      datasets: [
        {
          data: weeklyActivity.map(item => item.newLeads),
          label: 'New Leads',
          backgroundColor: '#3498db'
        },
        {
          data: weeklyActivity.map(item => item.followUps),
          label: 'Follow-ups',
          backgroundColor: '#2ecc71'
        }
      ]
    };
  }

  calculateAdditionalMetrics() {
    if (!this.leadStats) return;

    // Calculate conversion rate
    this.conversionRate = this.leadStats.total > 0 
      ? (this.leadStats.converted / this.leadStats.total) * 100 
      : 0;

    // Calculate average response time (simulated)
    this.averageResponseTime = Math.floor(Math.random() * 24) + 1;

    // Get top performing sources
    this.topPerformingSources = Object.entries(this.leadStats.bySource || {})
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // Generate recent activities
    this.recentActivities = [
      { type: 'New Lead', count: this.leadStats.new, date: new Date() },
      { type: 'Follow-up', count: this.leadStats.followed_up, date: new Date() },
      { type: 'Conversion', count: this.leadStats.converted, date: new Date() }
    ];
  }

  generateReport(): void {
    this.isLoading = true;
    this.leadService.exportLeads().subscribe({
      next: (response) => {
        const blob = new Blob([response], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'leads_report.xlsx';
        link.click();
        window.URL.revokeObjectURL(url);
        this.isLoading = false;

        // Log the export action
        this.logService.addLog({
          action: 'export',
          entity: 'lead',
          entity_id: undefined,
          details: 'Generated leads report'
        }).subscribe();
      },
      error: (error) => {
        console.error('Error generating report:', error);
        this.isLoading = false;
        // You might want to show an error message to the user here
      }
    });
  }

  public refreshChart(chartType: 'status' | 'source' | 'country' | 'conversion' | 'activity'): void {
    console.log('Refreshing chart:', chartType);
    this.isLoading = true;
    this.loadDashboardData();
  }
}