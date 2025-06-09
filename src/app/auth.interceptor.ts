import { HttpRequest, HttpHandlerFn, HttpEvent, HttpInterceptorFn } from '@angular/common/http';
import { Observable } from 'rxjs';
import { inject } from '@angular/core';
import { AuthService } from './services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  const token = authService.getToken();
  
  if (token) {
    // Ensure token is a string and properly formatted
    const authHeader = `Bearer ${token}`;
    req = req.clone({
      setHeaders: {
        'Authorization': authHeader
      }
    });
  }

  return next(req);
};
