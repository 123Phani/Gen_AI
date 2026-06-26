import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AuthResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
  user: UserInfo;
}

export interface UserInfo {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  authProvider?: string;
  name: string;
  picture?: string;
  role?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface GoogleLoginRequest {
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_INFO_KEY = 'user_info';

  private readonly apiUrl = environment.apiUrl;

  // Angular Signals for state management
  private readonly _isAuthenticated = signal<boolean>(this.hasValidToken());
  private readonly _currentUser = signal<UserInfo | null>(this.loadStoredUser());

  // Public readonly signals
  readonly isAuthenticated = this._isAuthenticated.asReadonly();
  readonly currentUser = this._currentUser.asReadonly();
  readonly userDisplayName = computed(() => this._currentUser()?.name ?? 'User');

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/api/auth/login`, credentials).pipe(
      map(response => this.normalizeAuthResponse(response)),
      tap(response => this.handleAuthSuccess(response)),
      catchError(error => this.handleAuthError(error))
    );
  }

  googleLogin(token: string): Observable<AuthResponse> {
    const body: GoogleLoginRequest = { token };
    return this.http.post<AuthResponse>(`${this.apiUrl}/api/auth/google`, body).pipe(
      map(response => this.normalizeAuthResponse(response)),
      tap(response => this.handleAuthSuccess(response)),
      catchError(error => this.handleAuthError(error))
    );
  }

  logout(): void {
    const token = this.getToken();
    this.clearSession();

    if (!token) return;

    this.http.post<void>(
      `${this.apiUrl}/api/auth/logout`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    ).subscribe({ error: () => undefined });
  }

  refreshAccessToken(): Observable<AuthResponse> {
    const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);

    if (!refreshToken) {
      this.clearSession();
      return throwError(() => new Error('Missing refresh token'));
    }

    return this.http.post<AuthResponse>(`${this.apiUrl}/api/auth/refresh`, { refreshToken }).pipe(
      map(response => this.normalizeAuthResponse(response)),
      tap(response => this.handleAuthSuccess(response)),
      catchError(error => {
        this.clearSession();
        return this.handleAuthError(error);
      })
    );
  }

  clearSession(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_INFO_KEY);
    this._isAuthenticated.set(false);
    this._currentUser.set(null);
    this.router.navigate(['/login'], {
      queryParams: { signedOut: '1' },
      replaceUrl: true
    });
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private handleAuthSuccess(response: AuthResponse): void {
    const user = this.normalizeUser(response.user);

    localStorage.setItem(this.TOKEN_KEY, response.token);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refreshToken);
    localStorage.setItem(this.USER_INFO_KEY, JSON.stringify(user));
    this._isAuthenticated.set(true);
    this._currentUser.set(user);
  }

  private handleAuthError(error: unknown): Observable<never> {
    return throwError(() => error);
  }

  private hasValidToken(): boolean {
    const token = localStorage.getItem(this.TOKEN_KEY);
    return !!token && !this.isTokenExpired(token);
  }

  private loadStoredUser(): UserInfo | null {
    try {
      const stored = localStorage.getItem(this.USER_INFO_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private normalizeAuthResponse(response: AuthResponse): AuthResponse {
    return {
      ...response,
      user: this.normalizeUser(response.user)
    };
  }

  private normalizeUser(user: UserInfo): UserInfo {
    const name = user.name
      || [user.firstName, user.lastName].filter(Boolean).join(' ')
      || user.email
      || 'User';

    return {
      ...user,
      name,
      picture: user.picture ?? user.profilePicture
    };
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = token.split('.')[1];
      if (!payload) return true;

      const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
      const paddedPayload = normalizedPayload.padEnd(
        normalizedPayload.length + (4 - normalizedPayload.length % 4) % 4,
        '='
      );
      const decoded = JSON.parse(atob(paddedPayload));

      return typeof decoded.exp !== 'number' || decoded.exp * 1000 <= Date.now();
    } catch {
      return true;
    }
  }
}
