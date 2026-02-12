/**
 * Authentication Service
 * Handles Google OAuth and session management
 */

export interface AuthUser {
  email: string;
  googleId: string;
  name: string;
  picture?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

class AuthService {
  private readonly STORAGE_KEY = 'last_signal_auth';
  private currentUser: AuthUser | null = null;

  /**
   * Initialize auth service and check for existing session
   */
  init(): AuthUser | null {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const user = JSON.parse(stored) as AuthUser;
        // Check if token is expired
        if (user.expiresAt > Date.now()) {
          this.currentUser = user;
          return user;
        } else {
          // Token expired, clear storage
          this.logout();
        }
      } catch (e) {
        console.error('Failed to parse stored auth', e);
        this.logout();
      }
    }
    return null;
  }

  /**
   * Handle Google OAuth response
   */
  async handleGoogleLogin(credential: string): Promise<AuthResponse> {
    try {
      // Decode JWT token (Google ID token)
      const payload = this.decodeJWT(credential);
      
      if (!payload) {
        return { success: false, error: 'Invalid credential' };
      }

      const user: AuthUser = {
        email: payload.email,
        googleId: payload.sub,
        name: payload.name || payload.email.split('@')[0],
        picture: payload.picture,
        accessToken: credential,
        expiresAt: payload.exp * 1000 // Convert to milliseconds
      };

      // Store user data
      this.currentUser = user;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));

      // Sync with backend (if available)
      await this.syncWithBackend(user);

      return { success: true, user };
    } catch (error) {
      console.error('Google login failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Login failed' 
      };
    }
  }

  /**
   * Decode JWT token (simple implementation)
   */
  private decodeJWT(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('Failed to decode JWT:', e);
      return null;
    }
  }

  /**
   * Sync user data with backend
   */
  private async syncWithBackend(user: AuthUser): Promise<void> {
    try {
      const backendUrl = import.meta.env.VITE_FIREBASE_FUNCTIONS_URL;
      if (!backendUrl) {
        console.warn('Firebase Functions URL not configured, skipping sync');
        return;
      }

      const response = await fetch(`${backendUrl}/authSync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.accessToken}`
        },
        body: JSON.stringify({
          email: user.email,
          googleId: user.googleId,
          name: user.name,
          picture: user.picture
        })
      });

      if (!response.ok) {
        console.warn('Backend sync failed:', response.statusText);
      }
    } catch (error) {
      console.warn('Backend sync error:', error);
      // Don't fail login if backend sync fails
    }
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null && this.currentUser.expiresAt > Date.now();
  }

  /**
   * Logout user
   */
  logout(): void {
    this.currentUser = null;
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Refresh access token (if refresh token is available)
   */
  async refreshToken(): Promise<boolean> {
    if (!this.currentUser?.refreshToken) {
      return false;
    }

    try {
      const backendUrl = import.meta.env.VITE_FIREBASE_FUNCTIONS_URL;
      if (!backendUrl) {
        return false;
      }

      const response = await fetch(`${backendUrl}/refreshToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refreshToken: this.currentUser.refreshToken
        })
      });

      if (response.ok) {
        const data = await response.json();
        this.currentUser.accessToken = data.accessToken;
        this.currentUser.expiresAt = data.expiresAt;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.currentUser));
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    return false;
  }
}

export const authService = new AuthService();
