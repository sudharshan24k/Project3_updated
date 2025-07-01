import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor() {
    // Check if user was previously authenticated (session storage)
    const wasAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
    if (wasAuthenticated) {
      this.isAuthenticatedSubject.next(true);
    }
  }

  login(password: string): boolean {
    if (password === '1234') {
      this.isAuthenticatedSubject.next(true);
      sessionStorage.setItem('isAuthenticated', 'true');
      return true;
    }
    return false;
  }

  logout(): void {
    this.isAuthenticatedSubject.next(false);
    sessionStorage.removeItem('isAuthenticated');
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }
} 