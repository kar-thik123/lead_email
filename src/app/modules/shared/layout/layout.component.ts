import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { User } from '../../../models/user.model';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class LayoutComponent implements OnInit {
  sidebarCollapsed = signal<boolean>(false);
  userDropdownOpen = signal<boolean>(false);
  currentUser = signal<User | null>(null);
  currentRoute = signal<string>('');
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    this.currentUser.set(this.authService.currentUser());
    
    // Update current route on navigation
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.currentRoute.set(event.url);
        // Close user dropdown on navigation
        this.userDropdownOpen.set(false);
      }
    });
    
    // Set initial route
    this.currentRoute.set(this.router.url);
    
    // Check for mobile view on init
    this.checkMobileView();
    
    // Add window resize listener
    window.addEventListener('resize', this.onResize.bind(this));
  }
  
  ngOnDestroy(): void {
    // Remove window resize listener
    window.removeEventListener('resize', this.onResize.bind(this));
  }
  
  toggleSidebar(): void {
    this.sidebarCollapsed.update(value => !value);
  }
  
  toggleUserDropdown(): void {
    this.userDropdownOpen.update(value => !value);
  }
  
  closeUserDropdown(): void {
    this.userDropdownOpen.set(false);
  }
  
  logout(): void {
    this.authService.logout();
  }
  
  isRouteActive(route: string): boolean {
    return this.currentRoute().startsWith(route);
  }
  
  private checkMobileView(): void {
    if (window.innerWidth < 992) {
      this.sidebarCollapsed.set(true);
    }
  }
  
  private onResize(): void {
    this.checkMobileView();
  }
}