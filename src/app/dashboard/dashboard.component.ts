import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SocialAuthService } from '@abacritt/angularx-social-login';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatMenuModule,
    MatChipsModule,
    MatTooltipModule,
    MatSnackBarModule
  ],
  template: `
    <div class="dashboard-page">
      <!-- Background Blobs -->
      <div class="bg-blob blob-1"></div>
      <div class="bg-blob blob-2"></div>

      <!-- Top Nav -->
      <nav class="top-nav">
        <div class="nav-brand">
          <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" class="nav-logo">
            <rect width="40" height="40" rx="10" fill="url(#dgrad)"/>
            <circle cx="20" cy="20" r="9" fill="white"/>
            <circle cx="20" cy="20" r="4.5" fill="url(#dgrad)"/>
            <defs>
              <linearGradient id="dgrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#6C63FF"/>
                <stop offset="100%" stop-color="#3ECFCF"/>
              </linearGradient>
            </defs>
          </svg>
          <span class="nav-brand-name">SecureAuth</span>
        </div>

        <div class="nav-user">
          <div class="user-chip" [matMenuTriggerFor]="userMenu">
            @if (currentUser()?.picture) {
              <img [src]="currentUser()!.picture" [alt]="currentUser()!.name" class="user-avatar"/>
            } @else {
              <div class="user-avatar-placeholder">
                {{ (currentUser()?.name ?? 'U').charAt(0).toUpperCase() }}
              </div>
            }
            <span class="user-name">{{ currentUser()?.name ?? 'User' }}</span>
            <mat-icon class="chevron-icon">expand_more</mat-icon>
          </div>

          <mat-menu #userMenu="matMenu" class="user-menu-panel">
            <div class="menu-header">
              <p class="menu-email">{{ currentUser()?.email }}</p>
            </div>
            <button mat-menu-item (click)="logout()" class="logout-btn">
              <mat-icon>logout</mat-icon>
              <span>Sign out</span>
            </button>
          </mat-menu>
        </div>
      </nav>

      <!-- Main Content -->
      <main class="dashboard-main">
        <!-- Welcome Section -->
        <div class="welcome-section">
          <div class="welcome-text">
            <h1 class="welcome-title">
              Welcome back, <span class="highlight">{{ (currentUser()?.name ?? 'User').split(' ')[0] }}</span> 👋
            </h1>
            <p class="welcome-subtitle">Here's what's happening with your account today.</p>
          </div>
          <button mat-flat-button class="logout-action-btn" (click)="logout()" id="dashboard-logout-btn">
            <mat-icon>logout</mat-icon>
            Sign Out
          </button>
        </div>

        <!-- Stats Grid -->
        <div class="stats-grid">
          <mat-card class="stat-card">
            <div class="stat-icon-wrap teal">
              <mat-icon>security</mat-icon>
            </div>
            <div class="stat-body">
              <p class="stat-label">Security Score</p>
              <p class="stat-value">98/100</p>
              <p class="stat-delta positive"><mat-icon>trending_up</mat-icon> +2 this week</p>
            </div>
          </mat-card>

          <mat-card class="stat-card">
            <div class="stat-icon-wrap purple">
              <mat-icon>devices</mat-icon>
            </div>
            <div class="stat-body">
              <p class="stat-label">Active Sessions</p>
              <p class="stat-value">1</p>
              <p class="stat-delta">Current device only</p>
            </div>
          </mat-card>

          <mat-card class="stat-card">
            <div class="stat-icon-wrap green">
              <mat-icon>verified_user</mat-icon>
            </div>
            <div class="stat-body">
              <p class="stat-label">Account Status</p>
              <p class="stat-value">Active</p>
              <p class="stat-delta positive"><mat-icon>check_circle</mat-icon> Fully verified</p>
            </div>
          </mat-card>

          <mat-card class="stat-card">
            <div class="stat-icon-wrap orange">
              <mat-icon>schedule</mat-icon>
            </div>
            <div class="stat-body">
              <p class="stat-label">Last Login</p>
              <p class="stat-value">Just now</p>
              <p class="stat-delta">{{ currentUser()?.email }}</p>
            </div>
          </mat-card>
        </div>

        <!-- User Profile Card -->
        <mat-card class="profile-card">
          <div class="profile-header">
            @if (currentUser()?.picture) {
              <img [src]="currentUser()!.picture" [alt]="currentUser()!.name" class="profile-avatar"/>
            } @else {
              <div class="profile-avatar-placeholder">
                {{ (currentUser()?.name ?? 'U').charAt(0).toUpperCase() }}
              </div>
            }
            <div class="profile-info">
              <h2 class="profile-name">{{ currentUser()?.name ?? 'Unknown User' }}</h2>
              <p class="profile-email">{{ currentUser()?.email ?? '' }}</p>
              <div class="profile-badges">
                <span class="role-badge">{{ currentUser()?.role ?? 'Member' }}</span>
                <span class="status-badge active">Active</span>
              </div>
            </div>
            <button mat-stroked-button class="edit-profile-btn" matTooltip="Edit profile (coming soon)">
              <mat-icon>edit</mat-icon>
              Edit Profile
            </button>
          </div>

          <div class="profile-meta">
            <div class="meta-item">
              <mat-icon class="meta-icon">fingerprint</mat-icon>
              <span class="meta-label">User ID</span>
              <span class="meta-value">{{ currentUser()?.id ?? 'N/A' }}</span>
            </div>
            <div class="meta-item">
              <mat-icon class="meta-icon">mail</mat-icon>
              <span class="meta-label">Email</span>
              <span class="meta-value">{{ currentUser()?.email ?? 'N/A' }}</span>
            </div>
          </div>
        </mat-card>

        <!-- Auth Info -->
        <mat-card class="token-card">
          <div class="token-header">
            <mat-icon class="token-title-icon">key</mat-icon>
            <h3 class="token-title">Session Details</h3>
          </div>
          <div class="token-body">
            <div class="token-info-row">
              <mat-icon>check_circle</mat-icon>
              <span>JWT token stored securely in localStorage</span>
            </div>
            <div class="token-info-row">
              <mat-icon>check_circle</mat-icon>
              <span>HTTP interceptor attaches Bearer token to all API calls</span>
            </div>
            <div class="token-info-row">
              <mat-icon>check_circle</mat-icon>
              <span>Auth guard protects this route</span>
            </div>
          </div>
        </mat-card>
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .dashboard-page {
      min-height: 100vh;
      background: #0a0a1a;
      position: relative;
      overflow-x: hidden;
      font-family: 'Inter', sans-serif;
    }

    .bg-blob {
      position: fixed;
      border-radius: 50%;
      filter: blur(100px);
      pointer-events: none;
      opacity: 0.35;
    }
    .blob-1 { width: 500px; height: 500px; background: radial-gradient(circle, rgba(108,99,255,0.4) 0%, transparent 70%); top: -100px; left: -100px; }
    .blob-2 { width: 400px; height: 400px; background: radial-gradient(circle, rgba(62,207,207,0.3) 0%, transparent 70%); bottom: -100px; right: -80px; }

    /* Nav */
    .top-nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 32px;
      background: rgba(16,16,36,0.7);
      border-bottom: 1px solid rgba(108,99,255,0.15);
      backdrop-filter: blur(16px);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .nav-brand { display: flex; align-items: center; gap: 10px; }
    .nav-logo { width: 36px; height: 36px; }
    .nav-brand-name { font-size: 1.2rem; font-weight: 700; color: #f0f0ff; letter-spacing: -0.02em; }

    .user-chip {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 12px;
      background: rgba(108,99,255,0.1);
      border: 1px solid rgba(108,99,255,0.2);
      border-radius: 30px;
      cursor: pointer;
      transition: all 0.2s;
      &:hover { background: rgba(108,99,255,0.2); }
    }
    .user-avatar { width: 28px; height: 28px; border-radius: 50%; }
    .user-avatar-placeholder {
      width: 28px; height: 28px; border-radius: 50%;
      background: linear-gradient(135deg, #6C63FF, #3ECFCF);
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700; color: white;
    }
    .user-name { font-size: 0.85rem; font-weight: 500; color: #d0d0f0; }
    .chevron-icon { font-size: 18px !important; width: 18px !important; height: 18px !important; color: #6060a0; }

    .menu-header { padding: 12px 16px 8px; border-bottom: 1px solid rgba(108,99,255,0.15); }
    .menu-email { font-size: 0.8rem; color: #a0a0c0; margin: 0; }

    /* Main */
    .dashboard-main { max-width: 1000px; margin: 0 auto; padding: 40px 24px 60px; }

    .welcome-section {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 40px;
      flex-wrap: wrap;
    }
    .welcome-title {
      font-size: 2rem; font-weight: 700; color: #f0f0ff;
      letter-spacing: -0.03em; margin: 0 0 8px;
      .highlight {
        background: linear-gradient(90deg, #6C63FF, #3ECFCF);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      }
    }
    .welcome-subtitle { color: #a0a0c0; font-size: 0.9rem; margin: 0; }

    .logout-action-btn {
      border: 1px solid rgba(239,68,68,0.4) !important;
      color: #fca5a5 !important;
      border-radius: 10px !important;
      transition: all 0.2s !important;
      &:hover { background: rgba(239,68,68,0.1) !important; border-color: rgba(239,68,68,0.6) !important; }
    }

    /* Stats Grid */
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .stat-card {
      background: rgba(16,16,36,0.8) !important;
      border: 1px solid rgba(108,99,255,0.15) !important;
      border-radius: 16px !important;
      box-shadow: none !important;
      padding: 20px;
      display: flex; gap: 16px; align-items: flex-start;
      transition: all 0.2s;
      &:hover { border-color: rgba(108,99,255,0.35) !important; transform: translateY(-2px); }
    }
    .stat-icon-wrap {
      width: 44px; height: 44px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      mat-icon { font-size: 22px; color: white; }
      &.teal { background: linear-gradient(135deg, #0891B2, #3ECFCF); }
      &.purple { background: linear-gradient(135deg, #6C63FF, #a78bfa); }
      &.green { background: linear-gradient(135deg, #059669, #22c55e); }
      &.orange { background: linear-gradient(135deg, #d97706, #f59e0b); }
    }
    .stat-label { font-size: 0.78rem; color: #6060a0; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.06em; }
    .stat-value { font-size: 1.4rem; font-weight: 700; color: #f0f0ff; margin: 0 0 4px; }
    .stat-delta {
      font-size: 0.75rem; color: #6060a0; margin: 0;
      display: flex; align-items: center; gap: 2px;
      mat-icon { font-size: 14px !important; width: 14px !important; height: 14px !important; }
      &.positive { color: #4ade80; }
    }

    /* Profile Card */
    .profile-card {
      background: rgba(16,16,36,0.8) !important;
      border: 1px solid rgba(108,99,255,0.15) !important;
      border-radius: 16px !important;
      box-shadow: none !important;
      padding: 28px;
      margin-bottom: 20px;
    }
    .profile-header { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; margin-bottom: 24px; }
    .profile-avatar { width: 64px; height: 64px; border-radius: 50%; border: 2px solid rgba(108,99,255,0.4); }
    .profile-avatar-placeholder {
      width: 64px; height: 64px; border-radius: 50%;
      background: linear-gradient(135deg, #6C63FF, #3ECFCF);
      display: flex; align-items: center; justify-content: center;
      font-size: 24px; font-weight: 700; color: white;
    }
    .profile-name { font-size: 1.2rem; font-weight: 700; color: #f0f0ff; margin: 0 0 4px; }
    .profile-email { font-size: 0.85rem; color: #a0a0c0; margin: 0 0 10px; }
    .profile-badges { display: flex; gap: 8px; }
    .role-badge, .status-badge {
      font-size: 0.72rem; padding: 3px 10px; border-radius: 20px; font-weight: 500;
    }
    .role-badge { background: rgba(108,99,255,0.15); color: #a78bfa; border: 1px solid rgba(108,99,255,0.3); }
    .status-badge.active { background: rgba(34,197,94,0.12); color: #4ade80; border: 1px solid rgba(34,197,94,0.3); }
    .edit-profile-btn {
      margin-left: auto;
      border-color: rgba(108,99,255,0.3) !important;
      color: #a78bfa !important;
      border-radius: 10px !important;
    }

    .profile-meta { display: flex; flex-direction: column; gap: 12px; padding-top: 20px; border-top: 1px solid rgba(108,99,255,0.1); }
    .meta-item { display: flex; align-items: center; gap: 10px; }
    .meta-icon { font-size: 18px !important; color: #6060a0; }
    .meta-label { font-size: 0.82rem; color: #6060a0; min-width: 70px; }
    .meta-value { font-size: 0.88rem; color: #d0d0f0; }

    /* Token Card */
    .token-card {
      background: rgba(62,207,207,0.04) !important;
      border: 1px solid rgba(62,207,207,0.2) !important;
      border-radius: 16px !important;
      box-shadow: none !important;
      padding: 24px;
    }
    .token-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
    .token-title-icon { color: #3ECFCF; }
    .token-title { color: #f0f0ff; font-size: 1rem; font-weight: 600; margin: 0; }
    .token-body { display: flex; flex-direction: column; gap: 10px; }
    .token-info-row {
      display: flex; align-items: center; gap: 10px;
      font-size: 0.85rem; color: #a0a0c0;
      mat-icon { font-size: 18px !important; color: #22c55e; }
    }

    @media (max-width: 600px) {
      .top-nav { padding: 12px 16px; }
      .dashboard-main { padding: 24px 16px 40px; }
      .welcome-title { font-size: 1.5rem; }
    }
  `]
})
export class DashboardComponent {
  private readonly authService = inject(AuthService);
  private readonly socialAuthService = inject(SocialAuthService);
  private readonly snackBar = inject(MatSnackBar);

  readonly currentUser = this.authService.currentUser;

  async logout(): Promise<void> {
    try {
      await this.socialAuthService.signOut();
    } catch {
      // The user may have signed in with email/password or Google may not be initialized yet.
    }

    this.authService.logout();
    this.snackBar.open('You have been signed out.', 'Close', {
      duration: 3000,
      panelClass: ['snack-info']
    });
  }
}
