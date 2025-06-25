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
      font-weight: 500;
      letter-spacing: 0.02em;
      color: var(--surface-color);
      text-shadow: 0 2px 8px rgba(23, 78, 166, 0.08);
    }

.theme-toggle-chip {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 1.3rem;
  border-radius: 999px;
  background: var(--surface-color);
  color: var(--primary-color);
  font-weight: 600;
  font-size: 1.08rem;
  border: 1px solid var(--primary-color);
  box-shadow: 0 2px 12px var(--shadow-color-light);
  transition: background 0.18s, color 0.18s, box-shadow 0.18s, border 0.18s, transform 0.13s;
  cursor: pointer;
  outline: none;
}

.theme-toggle-chip:hover, .theme-toggle-chip:focus-visible {
box-shadow: 0 4px 20px var(--shadow-color-dark);
  transform: translateY(-2px) scale(1.04);
}

.theme-toggle-chip:active {
  transform: scale(0.97);
  background: var(--primary-color);
  color: var(--surface-color);
}

.theme-icon {
  font-size: 1.4em;
  vertical-align: middle;
  color: inherit;
  transition: color 0.18s;
}



    .header-right {
      display: flex;
      align-items: center;
      gap: 1.2rem;
      margin-right: 3rem;
    }

    .datetime {
      font-size: 1.08rem;
      font-weight: 500;
      color: var(--text-muted-color, #5f6368);
      background: var(--background-color, #f3f6fa);
      border-radius: 8px;
      padding: 0.35rem 1.1rem;
      margin-left: 1rem;
      box-shadow: 0 1px 4px var(--shadow-color-light, #e3eafc);
      letter-spacing: 0.01em;
      display: flex;
      align-items: center;
      min-width: 160px;
      justify-content: center;
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

