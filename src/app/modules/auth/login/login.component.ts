import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AlertComponent } from '../../shared/alert/alert.component';
import { UserCredentials } from '../../../models/user.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, AlertComponent, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  credentials: UserCredentials = { email: '', password: '' };
  isLoading = false;
  errorMessage: string | null = null;
  showAlert = false;
  alertMessage = '';
  alertType: 'success' | 'info' | 'warning' | 'danger' = 'danger';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  login(): void {
    if (!this.credentials.email || !this.credentials.password) {
      this.showErrorMessage('Please enter both email and password.');
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    
    this.authService.login(this.credentials).subscribe({
      next: () => {
        this.isLoading = false;
        this.showSuccessMessage('Login successful. Redirecting to dashboard...');
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.isLoading = false;
        this.showErrorMessage(error.message || 'Login failed. Please check your credentials.');
      }
    });
  }

  private showSuccessMessage(message: string): void {
    this.showAlert = true;
    this.alertMessage = message;
    this.alertType = 'success';
    
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      this.showAlert = false;
    }, 3000);
  }

  private showErrorMessage(message: string): void {
    this.showAlert = true;
    this.alertMessage = message;
    this.alertType = 'danger';
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      this.showAlert = false;
    }, 5000);
  }
}