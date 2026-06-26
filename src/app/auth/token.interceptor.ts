import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (token) {
    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
    return next(authReq).pipe(
      catchError(error => {
        if (shouldRefresh(error, req.url)) {
          return authService.refreshAccessToken().pipe(
            switchMap(response => next(req.clone({
              headers: req.headers.set('Authorization', `Bearer ${response.token}`)
            }))),
            catchError(refreshError => {
              authService.clearSession();
              return throwError(() => refreshError);
            })
          );
        }

        return throwError(() => error);
      })
    );
  }

  return next(req);
};

function shouldRefresh(error: unknown, url: string): boolean {
  return error instanceof HttpErrorResponse
    && error.status === 401
    && !url.includes('/api/auth/login')
    && !url.includes('/api/auth/google')
    && !url.includes('/api/auth/refresh')
    && !url.includes('/api/auth/logout');
}
