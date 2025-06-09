import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-alert',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="alert alert-{{ type }} alert-dismissible fade show" role="alert">
      <i class="bi {{ getAlertIcon() }} me-2"></i>
      {{ message }}
      <button *ngIf="dismissible" type="button" class="btn-close" (click)="onDismiss()" aria-label="Close"></button>
    </div>
  `,
  styles: [`
    .alert {
      position: fixed;
      bottom: 20px;
      right: 20px;
      min-width: 300px;
      max-width: 500px;
      z-index: 9999;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      animation: slideIn 0.3s ease-out;
    }
    
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `]
})
export class AlertComponent {
  @Input() message = '';
  @Input() type: 'success' | 'info' | 'warning' | 'danger' = 'info';
  @Input() dismissible = true;
  @Input() autoDismiss = 0; // Time in ms, 0 means no auto-dismiss
  @Output() dismiss = new EventEmitter<void>();
  
  private timeoutId: any = null;
  
  ngOnInit(): void {
    if (this.autoDismiss > 0) {
      this.timeoutId = setTimeout(() => {
        this.onDismiss();
      }, this.autoDismiss);
    }
  }
  
  ngOnDestroy(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }
  
  onDismiss(): void {
    this.dismiss.emit();
  }
  
  getAlertIcon(): string {
    switch (this.type) {
      case 'success': return 'bi-check-circle';
      case 'info': return 'bi-info-circle';
      case 'warning': return 'bi-exclamation-triangle';
      case 'danger': return 'bi-x-circle';
      default: return 'bi-info-circle';
    }
  }
}