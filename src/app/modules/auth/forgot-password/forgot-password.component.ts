import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AlertComponent } from '../../shared/alert/alert.component';
import { ResetPasswordRequest } from '../../../models/user.model';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AlertComponent],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent {
  resetRequest: ResetPasswordRequest = { email: '' };
  isLoading = false;
  showAlert = false;
  alertMessage = '';
  alertType: 'success' | 'info' | 'warning' | 'danger' = 'info';
  requestSent = false;

  constructor(private authService: AuthService) {}

  requestReset(): void {
    this.isLoading = true;
    
    // For demo, simulate success
    setTimeout(() => {
      this.isLoading = false;
      this.requestSent = true;
      this.showSuccessMessage(`Password reset link sent to ${this.resetRequest.email}. Please check your email.`);
    }, 1500);
    
    // In a real app, use this:
    /*
    this.authService.requestPasswordReset(this.resetRequest).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.requestSent = true;
        this.showSuccessMessage(response.message);
      },
      error: (error) => {
        this.isLoading = false;
        this.showErrorMessage(error.message || 'Failed to send reset link. Please try again.');
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