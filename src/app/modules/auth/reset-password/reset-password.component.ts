import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AlertComponent } from '../../shared/alert/alert.component';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AlertComponent],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-card-header">
          <div class="auth-logo">
            <i class="bi bi-key"></i>
          </div>
          <h2>Reset Password</h2>
          <p class="mb-0">Enter your new password</p>
        </div>
        <div class="auth-card-body">
          <ng-container *ngIf="!resetComplete; else resetDone">
            <form (ngSubmit)="resetPassword()" #resetForm="ngForm">
              <div class="auth-form-group">
                <label for="password"><i class="bi bi-lock"></i> New Password</label>
                <input 
                  type="password" 
                  class="form-control" 
                  id="password" 
                  name="password"
                  [(ngModel)]="newPassword"
                  required
                  minlength="6"
                  placeholder="Enter new password"
                >
              </div>
              
              <div class="auth-form-group">
                <label for="confirmPassword"><i class="bi bi-lock-fill"></i> Confirm Password</label>
                <input 
                  type="password" 
                  class="form-control" 
                  id="confirmPassword" 
                  name="confirmPassword"
                  [(ngModel)]="confirmPassword"
                  required
                  minlength="6"
                  placeholder="Confirm new password"
                >
              </div>
              
              <button 
                type="submit" 
                class="btn btn-primary w-100 mb-3" 
                [disabled]="!resetForm.form.valid || isLoading || !passwordsMatch"
              >
                <i class="bi bi-check-circle me-2"></i>
                {{ isLoading ? 'Resetting...' : 'Reset Password' }}
              </button>
              
              <div class="text-center">
                <a [routerLink]="['/auth/login']" class="auth-link">
                  <i class="bi bi-arrow-left me-1"></i> Back to Login
                </a>
              </div>
            </form>
          </ng-container>
          
          <ng-template #resetDone>
            <div class="text-center mb-4">
              <div class="icon-success">
                <i class="bi bi-check-circle-fill text-success" style="font-size: 4rem;"></i>
              </div>
              <h4 class="mt-3">Password Reset Successful!</h4>
              <p>Your password has been reset successfully.</p>
            </div>
            <a [routerLink]="['/auth/login']" class="btn btn-primary w-100">
              <i class="bi bi-box-arrow-in-right me-1"></i> Go to Login
            </a>
          </ng-template>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background-color: #f8f9fa;
    }
    
    .auth-card {
      background: white;
      border-radius: 10px;
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
      width: 100%;
      max-width: 400px;
      padding: 2rem;
    }
    
    .auth-card-header {
      text-align: center;
      margin-bottom: 2rem;
    }
    
    .auth-logo {
      font-size: 2.5rem;
      color: #0d6efd;
      margin-bottom: 1rem;
    }
    
    .auth-form-group {
      margin-bottom: 1.5rem;
    }
    
    .auth-form-group label {
      display: block;
      margin-bottom: 0.5rem;
      color: #495057;
    }
    
    .auth-link {
      color: #0d6efd;
      text-decoration: none;
    }
    
    .auth-link:hover {
      text-decoration: underline;
    }
    
    .icon-success {
      margin-bottom: 1rem;
    }
  `]
})
export class ResetPasswordComponent implements OnInit {
  newPassword = '';
  confirmPassword = '';
  isLoading = false;
  resetComplete = false;
  token: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token');
    if (!this.token) {
      this.router.navigate(['/auth/login']);
    }
  }

  get passwordsMatch(): boolean {
    return this.newPassword === this.confirmPassword;
  }

  resetPassword(): void {
    if (!this.token || !this.passwordsMatch) {
      return;
    }

    this.isLoading = true;
    
    this.authService.resetPassword(this.token, this.newPassword).subscribe({
      next: () => {
        this.isLoading = false;
        this.resetComplete = true;
      },
      error: (error) => {
        this.isLoading = false;
        // Handle error
        console.error('Password reset error:', error);
      }
    });
  }
}