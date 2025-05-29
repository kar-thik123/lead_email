import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app/app.routes';
import { AuthService } from './app/services/auth.service';
import { LogService } from './app/services/log.service';
import { LeadService } from './app/services/lead.service';
import { UserService } from './app/services/user.service';
import { authInterceptor } from './app/auth.interceptor';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    AuthService,
    provideAnimations(),
    AuthService,
    LogService,
    LeadService,
    UserService
  ]
});