import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../services/user.service';
import { User, NewUser } from '../../../models/user.model';
import { AlertComponent } from '../../shared/alert/alert.component';
import { LayoutComponent } from '../../shared/layout/layout.component';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, AlertComponent, LayoutComponent],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  newUser: NewUser = {
    username: '',
    email: '',
    password: '',
    role: 'user',
    status: 'active'
  };
  
  selectedUser: User | null = null;
  isLoading = false;
  showAddUserModal = false;
  showEditUserModal = false;
  showDeleteConfirm = false;
  
  showAlert = false;
  alertMessage = '';
  alertType: 'success' | 'danger' | 'info' | 'warning' = 'info';
  
  searchTerm = '';
  
  constructor(private userService: UserService) {}
  
  ngOnInit(): void {
    this.loadUsers();
  }
  
  loadUsers(): void {
    this.isLoading = true;
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.filteredUsers = users;
        this.isLoading = false;
      },
      error: (error) => {
        this.showErrorMessage('Failed to load users: ' + error.message);
        this.isLoading = false;
      }
    });
  }
  
  searchUsers(): void {
    if (!this.searchTerm.trim()) {
      this.filteredUsers = [...this.users];
      return;
    }
    
    const term = this.searchTerm.toLowerCase().trim();
    this.filteredUsers = this.users.filter(user => 
      user.username.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term) ||
      (user.first_name && user.first_name.toLowerCase().includes(term)) ||
      (user.last_name && user.last_name.toLowerCase().includes(term))
    );
  }
  
  openAddUserModal(): void {
    this.newUser = {
      username: '',
      email: '',
      password: '',
      role: 'user',
      status: 'active'
    };
    this.showAddUserModal = true;
  }
  
  closeAddUserModal(): void {
    this.showAddUserModal = false;
  }
  
  addUser(): void {
    this.isLoading = true;
    this.userService.createUser(this.newUser).subscribe({
      next: (user) => {
        this.users.unshift(user);
        this.filteredUsers = [...this.users];
        this.isLoading = false;
        this.showAddUserModal = false;
        this.showSuccessMessage(`User ${user.username} created successfully`);
      },
      error: (error) => {
        this.showErrorMessage('Failed to create user: ' + error.message);
        this.isLoading = false;
      }
    });
  }
  
  openEditUserModal(user: User): void {
    this.selectedUser = { ...user };
    this.showEditUserModal = true;
  }
  
  closeEditUserModal(): void {
    this.showEditUserModal = false;
    this.selectedUser = null;
  }
  
  updateUser(): void {
    if (!this.selectedUser) return;
    
    this.isLoading = true;
    this.userService.updateUser(this.selectedUser).subscribe({
      next: (updatedUser) => {
        const index = this.users.findIndex(u => u.id === updatedUser.id);
        if (index !== -1) {
          this.users[index] = updatedUser;
          this.filteredUsers = [...this.users];
        }
        this.isLoading = false;
        this.showEditUserModal = false;
        this.showSuccessMessage(`User ${updatedUser.username} updated successfully`);
      },
      error: (error) => {
        this.showErrorMessage('Failed to update user: ' + error.message);
        this.isLoading = false;
      }
    });
  }
  
  confirmDeleteUser(user: User): void {
    this.selectedUser = user;
    this.showDeleteConfirm = true;
  }
  
  closeDeleteConfirm(): void {
    this.showDeleteConfirm = false;
    this.selectedUser = null;
  }
  
  deleteUser(): void {
    if (!this.selectedUser) return;
    
    this.isLoading = true;
    this.userService.deleteUser(this.selectedUser.id).subscribe({
      next: () => {
        this.users = this.users.filter(u => u.id !== this.selectedUser?.id);
        this.filteredUsers = this.filteredUsers.filter(u => u.id !== this.selectedUser?.id);
        
        this.isLoading = false;
        this.showDeleteConfirm = false;
        this.showSuccessMessage(`User ${this.selectedUser?.username} deleted successfully`);
        this.selectedUser = null;
      },
      error: (error) => {
        this.showErrorMessage('Failed to delete user: ' + error.message);
        this.isLoading = false;
      }
    });
  }
  
  toggleUserStatus(user: User): void {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    
    this.isLoading = true;
    this.userService.updateUserStatus(user.id, newStatus).subscribe({
      next: (updatedUser) => {
        const index = this.users.findIndex(u => u.id === updatedUser.id);
        if (index !== -1) {
          this.users[index] = updatedUser;
          this.filteredUsers = [...this.users];
        }
        this.isLoading = false;
        this.showSuccessMessage(`User ${updatedUser.username} status changed to ${newStatus}`);
      },
      error: (error) => {
        this.showErrorMessage('Failed to update user status: ' + error.message);
        this.isLoading = false;
      }
    });
  }
  
  resetPassword(user: User): void {
    this.isLoading = true;
    this.userService.resetUserPassword(user.id).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.showSuccessMessage(response.message);
      },
      error: (error) => {
        this.showErrorMessage('Failed to reset password: ' + error.message);
        this.isLoading = false;
      }
    });
  }
  
  formatDate(date: Date): string {
    return new Date(date).toLocaleString();
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