import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, MatIconModule, MatButtonModule],
  template: `
    <header class="app-header">
      <h1>Dynamic Form Builder</h1>
      
      <div class="header-right">
<button
  (click)="toggleTheme()"
  mat-raised-button
  color="accent"
  class="theme-toggle-chip"
  aria-label="Toggle Light/Dark Mode"
>
  <mat-icon class="theme-icon">
    {{ isDarkTheme ? 'dark_mode' : 'light_mode' }}
  </mat-icon>
  <span>{{ isDarkTheme ? 'Dark' : 'Light' }}</span>
</button>


        <span class="datetime">{{ currentDateTime | date:'medium' }}</span>
      </div>
    </header>
    <main class="app-content">
      <router-outlet />
    </main>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
    }

    .app-header {
      background-color: var(--primary-color);
      color: var(--on-primary-color);
      padding: 1rem 2rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
    }

    .app-header h1 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 400;
    }

.theme-toggle-chip {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 1rem;
  border-radius: 2rem;
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
  transition: background-color 0.3s ease, transform 0.2s ease;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
}

.theme-toggle-chip:hover {
  background-color: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.theme-toggle-chip:active {
  transform: scale(0.95);
}

.theme-icon {
  font-size: 20px;
}



    .header-right {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-right: 3rem;
    }

    .datetime {
      font-size: 1rem;
      font-weight: 500;
      padding: 0 0.5rem;
    }

    .app-content {
      flex: 1;
      overflow-y: auto;
      padding-top: 4.5rem;
    }
  `],
})
export class App {
  isDarkTheme = false;
  currentDateTime = new Date();

  constructor() {
    setInterval(() => {
      this.currentDateTime = new Date();
    }, 1000);
  }

  toggleTheme() {
    this.isDarkTheme = !this.isDarkTheme;
    document.body.classList.toggle('dark-theme', this.isDarkTheme);
  }
}
