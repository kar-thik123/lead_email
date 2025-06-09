import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AlertComponent } from '../../shared/alert/alert.component';
import { ResetPasswordConfirm } from '../../../models/user.model';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AlertComponent],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {
  resetData: ResetPasswordConfirm = {
    token: '',
    password: '',
    confirmPassword: ''
  };
  
  isLoading = false;
  showAlert = false;
  alertMessage = '';
  alertType: 'success' | 'info' | 'warning' | 'danger' = 'info';
  resetSuccess = false;
  
  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['token']) {
        this.resetData.token = params['token'];
      }
    });
  }
  
  resetPassword(): void {
    if (this.resetData.password !== this.resetData.confirmPassword) {
      this.showErrorMessage('Passwords do not match. Please try again.');
      return;
    }
    
    this.isLoading = true;
    
    // For demo, simulate success
    setTimeout(() => {
      this.isLoading = false;
      this.resetSuccess = true;
      this.showSuccessMessage('Password has been reset successfully. You can now login with your new password.');
      
      // Redirect to login after a short delay
      setTimeout(() => {
        this.router.navigate(['/auth/login']);
      }, 3000);
    }, 1500);
    
    // In a real app, use this:
    /*
    this.authService.confirmPasswordReset(this.resetData).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.resetSuccess = true;
        this.showSuccessMessage(response.message);
        
        // Redirect to login after a short delay
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 3000);
      },
      error: (error) => {
        this.isLoading = false;
        this.showErrorMessage(error.message || 'Failed to reset password. Please try again.');
      }
    });
    */
  }
  
  private showSuccessMessage(message: string): void {
    this.showAlert = true;
    this.alertMessage = message;
    this.alertType = 'success';
  }
  
  private showErrorMessage(message: string): void {
    this.showAlert = true;
    this.alertMessage = message;
    this.alertType = 'danger';
  }
}