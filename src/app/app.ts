import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { LaunchpadComponent } from './launchpad/launchpad.component';
import { DashboardComponent } from './dashboard.component';
import { DynamicForm } from './dynamic-form/dynamic-form.component';
import { TemplateHistoryComponent } from './template-history/template-history.component';
import { HelpdeskComponent } from './helpdesk.component';
import { SubmissionsViewerComponent } from './submissions-viewer.component';
import { SearchByFillerComponent } from './search-by-filler.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    MatIconModule, 
    MatButtonModule, 
    LaunchpadComponent, 
    DashboardComponent, 
    DynamicForm, 
    TemplateHistoryComponent, 
    HelpdeskComponent, 
    SubmissionsViewerComponent, 
    SearchByFillerComponent
  ],
  template: `
    <header class="app-header">
      <button class="back-button header-back-btn" 
              (click)="onBackNavigation()" 
              aria-label="Back" 
              *ngIf="shouldShowBackButton()">
        <mat-icon>arrow_back</mat-icon>
        <span>Back</span>
      </button>
      
      <h1 [class.no-back-button]="!shouldShowBackButton()">
        {{
          (currentView === 'dashboard' && dashboardTeam === 'application') ||
          (['form', 'submissions', 'history', 'helpdesk'].includes(currentView) && previousView === 'dashboard' && dashboardTeam === 'application')
            ? 'Configuration File Generator'
          : (currentView === 'dashboard' && dashboardTeam === 'framework') ||
            (['form', 'submissions', 'history', 'helpdesk'].includes(currentView) && previousView === 'dashboard' && dashboardTeam === 'framework')
            ? 'Configuration File Template Generator and Management'   
          : 'Configuration File Generator and Template Management'
        }}
      </h1>
      
      <div class="header-right">
        <button (click)="toggleTheme()" 
                mat-raised-button 
                color="accent" 
                class="theme-toggle-chip" 
                aria-label="Toggle Light/Dark Mode">
          <mat-icon class="theme-icon">{{ isDarkTheme ? 'dark_mode' : 'light_mode' }}</mat-icon>
          <span>{{ isDarkTheme ? 'Dark' : 'Light' }}</span>
        </button>
        
        <span class="datetime">{{ currentDateTime | date:'medium' }}</span>
      </div>
    </header>

    <main class="app-content">
      <ng-container [ngSwitch]="currentView">
        <app-launchpad *ngSwitchCase="'launchpad'" 
                       (navigate)="onNavigate($event)">
        </app-launchpad>
        
        <app-dashboard *ngSwitchCase="'dashboard'" 
                       [team]="dashboardTeam" 
                       (navigate)="onNavigate($event)" 
                       (back)="onBackNavigation()">
        </app-dashboard>
        
        <app-dynamic-form *ngSwitchCase="'form'" 
                          [mode]="formMode" 
                          [templateName]="formTemplateName" 
                          [prefillSubmissionData]="prefillSubmissionData" 
                          (formClose)="onBackNavigation()">
        </app-dynamic-form>
        
        <app-template-history *ngSwitchCase="'history'" 
                              [templateName]="formTemplateName" 
                              (close)="onBackNavigation()">
        </app-template-history>
        
        <app-submissions-viewer *ngSwitchCase="'submissions'" 
                                [templateName]="formTemplateName" 
                                (close)="onBackNavigation()" 
                                (duplicateEdit)="onDuplicateEdit($event)">
        </app-submissions-viewer>
        
        <app-helpdesk *ngSwitchCase="'helpdesk'" 
                      (close)="onBackNavigation()">
        </app-helpdesk>
        
        <app-search-by-filler *ngSwitchCase="'search-by-filler'" 
                              (back)="currentView = 'dashboard'" 
                              (duplicateEdit)="onDuplicateEdit($event)">
        </app-search-by-filler>
      </ng-container>
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
      min-height: 64px;
    }

    .app-header h1 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 500;
      letter-spacing: 0.02em;
      color: var(--surface-color);
      text-shadow: 0 2px 8px rgba(23, 78, 166, 0.08);
      margin-left: 120px;
      transition: margin-left 0.3s ease;
    }

    .app-header h1.no-back-button {
      margin-left: 0;
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

    .app-content.no-header {
      padding-top: 0;
    }
.back-button {
  background: transparent !important;
  border: 2px solid rgba(255, 255, 255, 0.8) !important;
  border-radius: 25px !important;
  padding: 8px 16px !important;
  
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
  color: rgba(255, 255, 255, 0.9) !important;
  font-size: 14px !important;
  font-weight: 600 !important;
  text-decoration: none !important;
  text-transform: uppercase !important;
  letter-spacing: 0.5px !important;
  
  transition: color 0.3s ease, border-color 0.3s ease, background 0.3s ease !important;
  cursor: pointer !important;
  position: relative !important;
  overflow: hidden !important;
  
  z-index: 1001 !important;
  min-width: 80px !important;
  height: 36px !important;
}

.back-button mat-icon {
  transition: color 0.3s ease !important;
  color: rgba(255, 255, 255, 0.9) !important;
  font-size: 18px !important;
  width: 18px !important;
  height: 18px !important;
}

.back-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.2);
  transition: left 0.3s ease;
  z-index: -1;
}

.back-button:hover::before {
  left: 0;
}

.back-button:hover {
  color: white !important;
  border-color: rgba(255, 255, 255, 1) !important;
  background: rgba(255, 255, 255, 0.1) !important;
}

.back-button:hover mat-icon {
  color: white !important;
}

.header-back-btn {
  position: absolute !important;
  left: 1.5rem !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  z-index: 1001 !important;
}

  `],
})
export class AppComponent implements OnDestroy {
  isDarkTheme = false;
  currentDateTime = new Date();
  intervalId: any;
  currentView: 'launchpad' | 'dashboard' | 'form' | 'history' | 'submissions' | 'helpdesk' | 'search-by-filler' = 'launchpad';
  previousView: 'launchpad' | 'dashboard' | 'form' | 'history' | 'submissions' | 'helpdesk' | 'search-by-filler' = 'launchpad';
  dashboardTeam: 'application' | 'framework' = 'application';
  formMode: 'create' | 'edit' | 'use' | 'preview' = 'use';
  formTemplateName: string | null = null;
  prefillSubmissionData: any = null;

  constructor() {
    this.intervalId = setInterval(() => {
      this.currentDateTime = new Date();
    }, 1000);
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  // NEW METHOD: Determines when to show back button
  shouldShowBackButton(): boolean {
    // Show back button only when in specific action views, not on dashboard homepage
    return ['form', 'history', 'submissions', 'helpdesk', 'search-by-filler'].includes(this.currentView);
  }

  toggleTheme() {
    this.isDarkTheme = !this.isDarkTheme;
    document.body.classList.toggle('dark-theme', this.isDarkTheme);
  }

  onNavigate(event: any) {
    // Store the current view as previous before changing
    this.previousView = this.currentView;
    
    // event can be a string (view) or an object { view, mode, templateName, team }
    if (typeof event === 'string') {
      this.currentView = event as any;
      if (event === 'launchpad') {
        this.formTemplateName = null;
      }
    } else if (typeof event === 'object') {
      this.currentView = event.view;
      if (event.mode) this.formMode = event.mode;
      if (event.templateName) this.formTemplateName = event.templateName;
      if (event.team) this.dashboardTeam = event.team;
    }
  }

  // Smart back navigation - return to the correct dashboard based on where user came from
  onBackNavigation() {
    // If we're in a form, history, submissions, or helpdesk, go back to the dashboard we came from
    if (this.currentView === 'form' || this.currentView === 'history' || this.currentView === 'submissions' || this.currentView === 'helpdesk') {
      this.currentView = 'dashboard';
      // Keep the dashboardTeam as is - we want to return to the same dashboard
    } else if (this.currentView === 'dashboard') {
      this.currentView = 'launchpad';
      this.dashboardTeam = 'application'; // Reset to default
    }
    
    // Clear form data when going back
    this.formTemplateName = null;
  }

  onDuplicateEdit(event: { template: string, prefillSubmissionData: any }) {
    this.formTemplateName = event.template;
    this.prefillSubmissionData = event.prefillSubmissionData;
    this.formMode = 'use';
    this.currentView = 'form';
  }
}
