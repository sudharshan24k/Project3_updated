import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MatIconModule, MatButtonModule, NgIf],
  template: `
    <header class="app-header">
      <h1>Dynamic Form Builder</h1>
      <div class="theme-toggler-wrapper" (mouseenter)="showToggler = true" (mouseleave)="showToggler = false">
        <button *ngIf="showToggler" (click)="toggleTheme()" mat-icon-button matTooltip="Toggle Light/Dark Mode">
          <mat-icon>{{ isDarkTheme ? 'dark_mode' : 'light_mode' }}</mat-icon>
        </button>
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

    .theme-toggler-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      height: 100%;
    }

    .theme-toggler-wrapper button {
      transition: opacity 0.2s;
      opacity: 1;
    }

    .theme-toggler-wrapper:not(:hover) button {
      opacity: 0;
      pointer-events: none;
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
  showToggler = false;

  toggleTheme() {
    this.isDarkTheme = !this.isDarkTheme;
    document.body.classList.toggle('dark-theme', this.isDarkTheme);
  }
}
