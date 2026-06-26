import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

// Google Social Login
import { GoogleSigninButtonModule, SocialAuthService } from '@abacritt/angularx-social-login';
import { Subscription } from 'rxjs';

// Services
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule,
    MatTooltipModule,
    GoogleSigninButtonModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
  // Signals for state management
  readonly isLoading = signal(false);
  readonly showPassword = signal(false);
  readonly errorMessage = signal('');
  readonly formAnimated = signal(false);

  loginForm!: FormGroup;
  returnUrl = '/dashboard';
  private googleAuthSub?: Subscription;
  private ignoreNextGoogleAuthState = false;

  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly socialAuthService = inject(SocialAuthService);

  ngOnInit(): void {
    // If already authenticated, redirect away
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
    this.ignoreNextGoogleAuthState = this.route.snapshot.queryParamMap.has('signedOut');

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });

    // Trigger animation
    setTimeout(() => this.formAnimated.set(true), 50);

    // Listen for Google sign-in events
    this.googleAuthSub = this.socialAuthService.authState.subscribe(user => {
      if (user?.idToken) {
        if (this.ignoreNextGoogleAuthState) {
          this.ignoreNextGoogleAuthState = false;
          return;
        }

        this.handleGoogleUser(user.idToken);
      }
    });
  }

  ngOnDestroy(): void {
    this.googleAuthSub?.unsubscribe();
  }

  get emailControl(): AbstractControl {
    return this.loginForm.get('email')!;
  }

  get passwordControl(): AbstractControl {
    return this.loginForm.get('password')!;
  }

  getEmailError(): string {
    const ctrl = this.emailControl;
    if (ctrl?.hasError('required')) return 'Email is required';
    if (ctrl?.hasError('email')) return 'Please enter a valid email address';
    return '';
  }

  getPasswordError(): string {
    const ctrl = this.passwordControl;
    if (ctrl?.hasError('required')) return 'Password is required';
    if (ctrl?.hasError('minlength')) return 'Password must be at least 8 characters';
    return '';
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  onSubmit(): void {
    if (this.loginForm.invalid || this.isLoading()) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    const { email, password } = this.loginForm.value;

    this.authService.login({ email, password }).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.snackBar.open(
          `Login Successful! Welcome back, ${response.user.name}`,
          'Close',
          { duration: 4000, panelClass: ['snack-success'] }
        );
        this.router.navigate([this.returnUrl]);
      },
      error: (err) => {
        this.isLoading.set(false);
        const message = this.extractErrorMessage(err);
        this.errorMessage.set(message);
        this.snackBar.open(message, 'Close', {
          duration: 5000,
          panelClass: ['snack-error']
        });
      }
    });
  }

  private handleGoogleUser(idToken: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.googleLogin(idToken).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.snackBar.open(
          `Login Successful! Welcome back, ${response.user.name}`,
          'Close',
          { duration: 4000, panelClass: ['snack-success'] }
        );
        this.router.navigate([this.returnUrl]);
      },
      error: (err) => {
        this.isLoading.set(false);
        const statusCode = err?.status;
        const message =
          statusCode === 403 || statusCode === 401
            ? 'This Google account is not authorized'
            : this.extractErrorMessage(err);
        this.errorMessage.set(message);
        this.snackBar.open(message, 'Close', {
          duration: 5000,
          panelClass: ['snack-error']
        });
      }
    });
  }

  private extractErrorMessage(err: any): string {
    if (!err) return 'An unexpected error occurred';
    if (err.status === 0 || err.status === undefined) {
      return 'Unable to connect to server. Please try again.';
    }
    if (err.error?.error === 'PROVIDER_MISMATCH') {
      return err.error.message || 'This email uses Google sign-in. Please continue with Google.';
    }
    return err.error?.message || err.message || 'An unexpected error occurred';
  }
}
