import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="not-found-container">
      <div class="not-found-content text-center">
        <div class="not-found-icon">
          <i class="bi bi-exclamation-triangle-fill"></i>
        </div>
        <h1 class="not-found-title">404</h1>
        <h2 class="not-found-subtitle">Page Not Found</h2>
        <p class="not-found-message">Sorry, the page you're looking for doesn't exist or has been moved.</p>
        <div class="mt-4">
          <a [routerLink]="['/dashboard']" class="btn btn-primary">
            <i class="bi bi-house-door me-2"></i>Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .not-found-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 80vh;
    }
    
    .not-found-content {
      max-width: 500px;
      padding: 40px;
      border-radius: 8px;
      background-color: white;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .not-found-icon {
      font-size: 4rem;
      color: var(--warning);
      margin-bottom: 20px;
    }
    
    .not-found-title {
      font-size: 6rem;
      font-weight: bold;
      color: var(--primary);
      margin-bottom: 0;
    }
    
    .not-found-subtitle {
      font-size: 1.5rem;
      color: var(--gray-700);
      margin-bottom: 20px;
    }
    
    .not-found-message {
      color: var(--gray-600);
      font-size: 1.1rem;
    }
  `]
})
export class NotFoundComponent {}