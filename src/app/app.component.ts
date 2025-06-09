import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { LayoutComponent } from './modules/shared/layout/layout.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, LayoutComponent],
  template: `

      <router-outlet></router-outlet>
   
  `,
  styles: []
})
export class AppComponent {
  title = 'lead-management-system';
} 