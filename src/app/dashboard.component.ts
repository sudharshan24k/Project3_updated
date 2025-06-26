import { CommonModule, NgIf, NgFor } from '@angular/common';
import { Component, OnInit, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { DynamicForm } from './dynamic-form/dynamic-form';
import { SchemaService, TemplateInfo } from './dynamic-form/schema.service';
import { SubmissionsViewerComponent } from './submissions-viewer.component';
import { TemplateHistoryComponent } from './template-history/template-history.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, DynamicForm, SubmissionsViewerComponent, MatIconModule, MatTooltipModule, MatButtonModule, FormsModule, MatTabsModule, MatExpansionModule, TemplateHistoryComponent],
  template: `
    <div class="container">
      <div *ngIf="mode === 'list'">
        <header class="dashboard-header">
          <div>
            <h1>Form Templates</h1>
            <p class="subtitle">Create, manage, and use your form templates.</p>
          </div>
          <div class="header-actions">
            <button (click)="showCreateTemplate()" mat-raised-button>
              <mat-icon>add</mat-icon>
              <span>Create New Template</span>
            </button>
          </div>
        </header>
        <div class="filter-bar card modern-search-bar team-search-bar">
          <select class="team-dropdown" [(ngModel)]="selectedTeam" (change)="applyFilters()">
            <option value="">All Teams</option>
            <option *ngFor="let team of teamNames" [value]="team">{{ team }}</option>
          </select>
          <input
            type="text"
            class="main-search-input"
            placeholder="Search templates..."
            [(ngModel)]="searchText"
            (keyup.enter)="applyFilters()"
            (input)="applyFilters()"
          >
          <button
            mat-icon-button
            class="search-icon-btn"
            (click)="searchText ? clearSearch() : null"
            [attr.aria-label]="searchText ? 'Clear search' : 'Search'"
            tabindex="0"
          >
            <span *ngIf="!searchText" class="search-emoji">🔍</span>
            <mat-icon *ngIf="searchText">close</mat-icon>
          </button>
          <button
            mat-stroked-button
            class="advanced-toggle"
            (click)="toggleAdvancedSearch()"
            [class.active]="advancedSearch"
          >
            <mat-icon>tune</mat-icon>
            <span>Advanced Search</span>
          </button>
        </div>
        <div *ngIf="advancedSearch" class="advanced-fields card">
          <input
            type="text"
            class="filter-input"
            placeholder="Description contains..."
            [(ngModel)]="filterDescription"
            (input)="applyFilters()"
          >
          <input
            type="text"
            class="filter-input"
            placeholder="Author name contains..."
            [(ngModel)]="filterAuthor"
            (input)="applyFilters()"
          >
          <input
            type="text"
            class="filter-input"
            placeholder="Version tag contains..."
            [(ngModel)]="filterVersionTag"
            (input)="applyFilters()"
          >
          <input
            type="text"
            class="filter-input"
            placeholder="Audit pipeline contains..."
            [(ngModel)]="filterAuditPipeline"
            (input)="applyFilters()"
          >
          <div class="date-range-filter">
            <div class="date-input-group">
              <input #startDateInput type="date" class="filter-input" [(ngModel)]="filterStartDate" (change)="applyFilters()">
              <button mat-icon-button tabindex="-1" class="calendar-btn" matTooltip="Pick start date" type="button" (click)="openDatePicker(startDateInput)">
                <mat-icon>calendar_today</mat-icon>
              </button>
            </div>
            <span class="date-range-separator">to</span>
            <div class="date-input-group">
              <input #endDateInput type="date" class="filter-input" [(ngModel)]="filterEndDate" (change)="applyFilters()">
              <button mat-icon-button tabindex="-1" class="calendar-btn" matTooltip="Pick end date" type="button" (click)="openDatePicker(endDateInput)">
                <mat-icon>calendar_today</mat-icon>
              </button>
            </div>
          </div>
        </div>
        <div class="view-switcher">
          <button mat-icon-button (click)="displayMode = 'tabcard'" [class.active]="displayMode === 'tabcard'" matTooltip="Tab+Card View">
            <mat-icon>tab</mat-icon>
          </button>
          <button mat-icon-button (click)="displayMode = 'list'" [class.active]="displayMode === 'list'" matTooltip="List View">
            <mat-icon>view_list</mat-icon>
          </button>
        </div>
        <ng-container *ngIf="displayMode === 'tabcard'">
        
          <div class="tab-scrollbar-wrapper">
            <button *ngIf="showTabScrollLeft" class="tab-scroll-btn left" mat-icon-button (click)="scrollTabWindow('left')">
              <mat-icon>chevron_left</mat-icon>
            </button>
            <div class="tab-scrollbar" #tabScrollDiv>
              <div *ngIf="isLoading" class="loading-container">
                <div class="loading-spinner">
                  <mat-icon class="spinning">refresh</mat-icon>
                  <p>Loading templates...</p>
                </div>
              </div>
              <mat-tab-group [(selectedIndex)]="selectedTabIndexInWindow" class="schema-tabs" *ngIf="!isLoading && baseNames.length > 0">
                <mat-tab *ngFor="let baseName of visibleBaseNames; let i = index">
                  <ng-template mat-tab-label>
                    <span class="base-name tabcard-base-name">{{ baseName }}</span>
                  </ng-template>
                  <div class="version-cards">
                    <div class="version-card card" *ngFor="let version of groupedTemplates[baseName]">
                      <div class="template-title-group">
                        <mat-icon class="template-icon">description</mat-icon>
                        <div>
                          <h3>{{ version.name }}</h3>
                          <p class="template-desc" *ngIf="version.description">{{ version.description }}</p>
                          <div class="template-meta-container">
                            <div class="template-meta" *ngIf="version.created_at">
                              <mat-icon>calendar_today</mat-icon>
                              <span>{{ version.created_at | date:'mediumDate' }}</span>
                            </div>
                            <div class="template-meta" *ngIf="version.author">
                              <mat-icon>person</mat-icon>
                              <span>{{ version.author }}</span>
                            </div>
                            <div class="template-meta" *ngIf="version.team_name">
                              <mat-icon>group</mat-icon>
                              <span>{{ version.team_name }}</span>
                            </div>
                            <div class="template-meta" *ngIf="version.audit_pipeline">
                              <mat-icon>assignment</mat-icon>
                              <span>{{ version.audit_pipeline }}</span>
                            </div>
                            <div class="template-meta" *ngIf="version.version_tag">
                              <mat-icon>sell</mat-icon>
                              <span>{{ version.version_tag }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div class="actions">
                        <button mat-icon-button (click)="useTemplate(version.name)" matTooltip="Fill Out Form">
                          <mat-icon fontIcon="dynamic_form" class="action-icon"></mat-icon>
                        </button>
                        <button mat-icon-button (click)="editTemplate(version)" matTooltip="Edit Schema">
                          <mat-icon fontIcon="edit" class="action-icon"></mat-icon>
                        </button>
                        <button mat-icon-button (click)="previewTemplate(version.name)" matTooltip="Preview Form">
                          <mat-icon fontIcon="visibility" class="action-icon"></mat-icon>
                        </button>
                        <button mat-icon-button (click)="viewSubmissions(version.name)" matTooltip="View Submissions">
                          <mat-icon fontIcon="list_alt" class="action-icon"></mat-icon>
                        </button>
                        <button mat-icon-button (click)="viewHistory(version.name)" matTooltip="View History">
                          <mat-icon fontIcon="history" class="action-icon"></mat-icon>
                        </button>
                        <button mat-icon-button class="action-delete" (click)="deleteTemplate(version.name)" matTooltip="Delete Template">
                          <mat-icon fontIcon="delete_outline" class="action-icon"></mat-icon>
                        </button>
                      </div>
                    </div>
                  </div>
                </mat-tab>
              </mat-tab-group>
            </div>
            <button *ngIf="showTabScrollRight" class="tab-scroll-btn right" mat-icon-button (click)="scrollTabWindow('right')">
              <mat-icon>chevron_right</mat-icon>
            </button>
          </div>
        </ng-container>
        <ng-container *ngIf="displayMode === 'list'">
          <div *ngIf="isLoading" class="loading-container">
            <div class="loading-spinner">
              <mat-icon class="spinning">refresh</mat-icon>
              <p>Loading templates...</p>
            </div>
            <button *ngIf="showTabScrollRight" class="tab-scroll-btn right" mat-icon-button (click)="scrollTabWindow('right')">
              <mat-icon>chevron_right</mat-icon>
            </button>
          </div>
          <mat-accordion *ngIf="!isLoading" class="list-view-accordion">
            <mat-expansion-panel *ngFor="let baseName of baseNames" [(expanded)]="expandedBase[baseName]">
              <mat-expansion-panel-header>
                <mat-panel-title class="list-view-panel-title">
                  <mat-icon class="template-icon">folder_open</mat-icon>
                  <span class="base-name">{{ baseName }}</span>
                  <span class="version-count-badge">{{ groupedTemplates[baseName].length }} versions</span>
                </mat-panel-title>
              </mat-expansion-panel-header>
              
              <div class="list-view-table" *ngIf="groupedTemplates[baseName]?.length">
                <div class="list-view-header">
                  <div class="list-cell">Template Name</div>
                  <div class="list-cell">Author</div>
                  <div class="list-cell">Team</div>
                  <div class="list-cell">FW_Version</div>
                  <div class="list-cell">Audit Pipeline</div>
                  <div class="list-cell">Date Created</div>
                  <div class="list-cell actions-header">Actions</div>
                </div>
                <div class="list-view-row" *ngFor="let version of groupedTemplates[baseName]">
                    <div class="list-cell name-cell">
                      <span class="clickable-schema" (click)="viewSchemaVersions(version.name)">{{ version.name }}</span>
                    </div>
                    <div class="list-cell">{{ version.author || '-' }}</div>
                    <div class="list-cell">{{ version.team_name || '-' }}</div>
                    <div class="list-cell">
                        <span class="version-tag" *ngIf="version.version_tag">{{ version.version_tag }}</span>
                        <span *ngIf="!version.version_tag">-</span>
                    </div>
                    <div class="list-cell">{{ version.audit_pipeline || '-' }}</div>
                    <div class="list-cell date-cell">{{ version.created_at ? (version.created_at | date:'mediumDate') : '-' }}</div>
                    <div class="list-cell actions-cell">
                      <button mat-icon-button (click)="useTemplate(version.name)" matTooltip="Fill Out Form">
                        <mat-icon fontIcon="dynamic_form" class="action-icon"></mat-icon>
                      </button>
                      <button mat-icon-button (click)="editTemplate(version)" matTooltip="Edit Schema">
                        <mat-icon fontIcon="edit" class="action-icon"></mat-icon>
                      </button>
                      <button mat-icon-button (click)="previewTemplate(version.name)" matTooltip="Preview Form">
                        <mat-icon fontIcon="visibility" class="action-icon"></mat-icon>
                      </button>
                      <button mat-icon-button (click)="viewSubmissions(version.name)" matTooltip="View Submissions">
                        <mat-icon fontIcon="list_alt" class="action-icon"></mat-icon>
                      </button>
                      <button mat-icon-button (click)="viewHistory(version.name)" matTooltip="View History">
                        <mat-icon fontIcon="history" class="action-icon"></mat-icon>
                      </button>
                      <button mat-icon-button class="action-delete" (click)="deleteTemplate(version.name)" matTooltip="Delete Template">
                        <mat-icon fontIcon="delete_outline" class="action-icon"></mat-icon>
                      </button>
                    </div>
                </div>
              </div>
            </mat-expansion-panel>
          </mat-accordion>
          <div *ngIf="baseNames.length === 0" class="card empty-state enhanced-card">
            <mat-icon class="empty-illustration">search</mat-icon>
            <h4>No templates match your filters.</h4>
            <p>Try adjusting your search criteria.</p>
          </div>
        </ng-container>
      </div>

      <div *ngIf="isFormMode()">
        <app-dynamic-form
          [mode]="mode"
          [templateName]="selectedTemplate"
          [prefillVersion]="duplicatedVersion"
          [prefillSubmissionName]="prefillSubmissionName"
          (formClose)="onFormClose()">
        </app-dynamic-form>
      </div>

      <div *ngIf="mode === 'submissions'">
        <header class="page-header">
          <button (click)="onFormClose()" class="back-button">
            <mat-icon>arrow_back</mat-icon>
            <span>Back to Templates</span>
          </button>
        </header>
        <app-submissions-viewer [templateName]="selectedTemplate" (duplicateEdit)="onDuplicateEdit($event)"></app-submissions-viewer>
      </div>
      
      <div *ngIf="mode === 'history'">
        <header class="page-header">
          <button (click)="onFormClose()" class="back-button">
            <mat-icon>arrow_back</mat-icon>
            <span>Back to Templates</span>
          </button>
        </header>
        <app-template-history [templateName]="selectedTemplate"></app-template-history>
      </div>

      <div class="dashboard-footer">
        <button mat-stroked-button (click)="navigateToHelpdesk()">
          <mat-icon>help_outline</mat-icon>
          <span>Helpdesk</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2.5rem;
      background: linear-gradient(90deg, var(--primary-color-light) 0%, var(--primary-color) 100%);
      border-radius: 1rem;
      padding: 2rem 2.5rem 1.5rem 2.5rem;
      box-shadow: 0 4px 24px var(--shadow-color-dark);
      background-color: var(--surface-color);
    }
    .dashboard-header h1 {
        margin-bottom: 0.25rem;
    }
    .subtitle {
        margin: 0;
        color: var(--text-muted-color);
        font-size: 1.1rem;
    }
    .dashboard-header button {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    .templates-list {
      margin-top: 1.5rem;
    }
    .template-list-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0 0.5rem;
      
    }
    .template-list-table th, .template-list-table td {
      padding: 1.25rem 1.5rem;
      background: var(--card-bg);
      border-radius: 0.75rem;
      vertical-align: middle;
      background-color: var(--surface-color);
    }
    .template-list-table th {
      text-align: left;
      font-size: 1.1rem;
      color: var(--text-muted-color);
      font-weight: 600;
      background: none;
      border-bottom: none;
    }
    .template-list-table td.actions {
      text-align: right;
      white-space: nowrap;
      background: none;
      background-color: var(--surface-color);
      
    }
    .template-list-table tr {
      transition: box-shadow 0.2s;
    }
    .template-list-table tr:hover td {
      box-shadow: 0 2px 12px var(--shadow-color-light);
      background: var(--primary-color-lightest);
    }
    .template-title-group {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
    }
    .template-icon {
        font-size: 2.2rem;
        color: var(--primary-color);
        margin-top: 0.1rem;
    }
    .template-desc {
        color: var(--text-muted-color);
        font-size: 1.05rem;
        margin: 0.15rem 0 0.1rem 0;
    }
    .template-meta {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        color: var(--text-muted-color);
        font-size: 0.9rem;
    }
    .template-meta mat-icon {
        font-size: 1rem;
        height: 1rem;
        width: 1rem;
    }
    .version-card .template-meta-container {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 1.5rem; /* row-gap column-gap */
      margin-top: 0.75rem;
    }
    .empty-state {
        text-align: center;
        padding: 3rem 2rem 2.5rem 2rem;
        border-radius: 1.25rem;
        background: var(--card-bg);
        box-shadow: 0 2px 8px var(--shadow-color-light);
        margin-top: 2.5rem;
    }
    .empty-illustration {
        font-size: 4.5rem;
        color: var(--primary-color-light);
        margin-bottom: 0.5rem;
    }
    .empty-state h4 {
        margin-bottom: 0.5rem;
    }
    .empty-state p {
        color: var(--text-muted-color);
        margin-bottom: 1.5rem;
    }
    .page-header {
        margin-bottom: 2rem;
    }
    .back-button {
        background: none;
        border: none;
        padding: 0;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--primary-color);
        font-size: 1rem;
        font-weight: 700;
        cursor: pointer;
    }
    .back-button:hover {
        text-decoration: underline;
        box-shadow: none;
        transform: none;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .filter-bar {
      display: flex;
      gap: 1rem;
      margin-bottom: 2rem;
      padding: 1.5rem;
      flex-wrap: wrap;
      background: var(--surface-color);
    }
    .filter-input, .filter-select {
      font-size: 1rem;
      padding: 0.75rem;
      border-radius: 8px;
      border: 1px solid var(--border-color);
      background-color: var(--surface-color);
      color: var(--text-color);
    }
    .filter-input:focus {
      border-color:#5B9DD9 !important; /* Highlight border color on focus */
      box-shadow: 0 0 0 2px rgba(91, 157, 217, 0.15);
      outline: none;
    }
    .dark-theme .filter-input:focus {
      border-color: #5B9DD9 !important;
      box-shadow: 0 0 0 2px rgba(118, 184, 243, 0.18);
      outline: none;
    }
    .filter-input {
      flex-grow: 1;
    }
    .date-range-filter {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .date-input-group {
      display: flex;
      align-items: center;
      gap: 0.2rem;
    }
    .calendar-btn {
      padding: 0 0.2rem;
      font-size: 1rem;
      color: var(--text-muted-color);
      background: none;
      border: none;
      cursor: pointer;
    }
    .clear-filters-btn {
        background: none;
        border: 1px solid var(--border-color);
        color: var(--text-muted-color);
    }
    .clear-filters-btn:hover {
        background: var(--background-color);
        color: var(--text-color);
        box-shadow: none;
        transform: none;
    }
    .view-switcher {
      text-align: right;
      margin-bottom: 1rem;
    }
    .view-switcher button {
      background: none;
      border-radius: 8px;
    }
    .view-switcher button.active {
      background-color: var(--secondary-color);
    }
    .schema-tabs { margin-top: 2rem; }
    .version-cards { display: flex; flex-wrap: wrap; gap: 2rem; margin-top: 2rem; }
    .version-card { 
      min-width: 340px; 
      max-width: 400px; 
      flex: 1 1 340px; 
      padding: 1.5rem; 
      border-radius: 1.25rem; 
      box-shadow: 0 2px 8px var(--shadow-color-light); 
      background: var(--surface-color); 
      display: flex; 
      flex-direction: column; 
      justify-content: space-between; 
    }
    .version-card .actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.5rem; }
    .base-name { font-size: 1.2rem; margin-left: 0.5rem; color: var(--text-color); }
    .tabcard-base-name {
      color: var(--text-color);
    }
    .modern-search-bar {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.5rem;
      margin-bottom: 0.5rem;
      background: var(--surface-color);
      border-radius: 1rem;
      box-shadow: 0 2px 8px var(--shadow-color-light);
    }
    .filter-bar.team-search-bar {
      display: flex;
      align-items: center;
      flex-direction: row;
      width: 100%;
      max-width: 100vw;
      box-sizing: border-box;
      gap: 0.75rem;
      min-height: 48px;
      padding: 0.5rem 0.5rem 0.5rem 0.5rem;
      background: var(--surface-color);
    }
    .team-dropdown {
      flex: 0 0 260px;
      max-width: 260px;
      min-width: 120px;
      height: 40px;
      padding: 0 1rem;
      border-radius: 0.5rem;
      border: 1px solid var(--border-color, #ccc);
      font-size: 1rem;
      background: var(--surface-color);
      box-sizing: border-box;
    }
    .main-search-input {
      flex: 1 1 0%;
      min-width: 180px;
      font-size: 1.1rem;
      padding: 0 1rem;
      border-radius: 0.5rem;
      border: 1px solid var(--border-color, #ccc);
      background: var(--surface-color);
      width: 100%;
      box-sizing: border-box;
      height: 40px;
      vertical-align: middle;
    }
    .search-icon-btn, .advanced-toggle {
      height: 40px;
      min-width: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 0.25rem;
    }
    .search-emoji {
      font-size: 1.5rem;
      line-height: 1;
    }
    .advanced-toggle {
      margin-left: 1rem;
      border-radius: 2rem;
      font-size: 1rem;
      padding: 0.5rem 1.2rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: none;
      border: 1.5px solid var(--border-color);
      color: var(--text-muted-color);
      transition: background 0.2s, color 0.2s;
    }
    .advanced-toggle.active, .advanced-toggle:hover {
      background: var(--primary-color-lightest);
      color: var(--primary-color);
      border-color: var(--primary-color);
    }
    .advanced-fields {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      margin-bottom: 1.5rem;
      padding: 1.2rem 1.5rem;
      border-radius: 1rem;
      background: var(--surface-color);
      box-shadow: 0 2px 8px var(--shadow-color-light);
    }
    .tab-next-btn, .tab-prev-btn {
      margin: 0 0.5rem;
      background: var(--card-bg);
      border-radius: 50%;
      box-shadow: 0 2px 8px var(--shadow-color-light);
      width: 2.2rem;
      height: 2.2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      cursor: pointer;
      opacity: 0.95;
      transition: background 0.2s;
    }
    .tab-next-btn:active, .tab-next-btn:focus, .tab-prev-btn:active, .tab-prev-btn:focus {
      background: var(--primary-color-lightest);
    }
    .tab-pagination-row {
      display: flex;
      align-items: center;
      margin-top: 2rem;
      margin-bottom: -2rem;
    }
    .tab-next-btn-standalone, .tab-prev-btn-standalone {
      margin-left: 0.5rem;
      background: var(--card-bg);
      border-radius: 50%;
      box-shadow: 0 2px 8px var(--shadow-color-light);
      width: 2.2rem;
      height: 2.2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      cursor: pointer;
      opacity: 0.95;
      transition: background 0.2s;
    }
    .tab-next-btn-standalone:active, .tab-next-btn-standalone:focus, .tab-prev-btn-standalone:active, .tab-prev-btn-standalone:focus {
      background: var(--primary-color-lightest);
    }
    .tab-scrollbar-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      margin-top: 2rem;
      margin-bottom: -2rem;
    }
    .tab-scrollbar {
      overflow-x: auto;
      flex: 1 1 auto;
      scrollbar-width: thin;
      scrollbar-color: var(--primary-color-light) var(--card-bg);
      min-width: 0;
      
    }
    .tab-scroll-btn.left, .tab-scroll-btn.right {
      position: absolute;
      top: 15%; /* was 50%, move higher for better alignment */
      transform: translateY(-50%);
      z-index: 3;
      background: var(--card-bg);
      border-radius: 50%;
      box-shadow: 0 2px 8px var(--shadow-color-light);
      width: 2.2rem;
      height: 2.2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      cursor: pointer;
      opacity: 0.95;
      transition: background 0.2s;
    }
    .tab-scroll-btn.left {
      left: 0.2rem;
    }
    .tab-scroll-btn.right {
      right: 0.2rem;
    }
    .tab-scroll-btn:active, .tab-scroll-btn:focus {
      background: var(--primary-color-lightest);
    }
    .tab-scrollbar::-webkit-scrollbar {
      height: 6px;
    }
    .tab-scrollbar::-webkit-scrollbar-thumb {
      background: var(--primary-color-light);
      border-radius: 3px;
    }
    .delete-btn:hover .mat-icon {
      color: #b71c1c !important;
    }
    
    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 200px;
      padding: 2rem;
    }
    
    .loading-spinner {
      text-align: center;
      color: var(--text-muted-color);
    }
    
    .loading-spinner mat-icon {
      font-size: 2rem;
      width: 2rem;
      height: 2rem;
      margin-bottom: 1rem;
    }
    
    .loading-spinner p {
      margin: 0;
      font-size: 1.1rem;
    }
    
    .spinning {
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    ::ng-deep mat-expansion-panel.mat-expansion-panel {
      background: var(--surface-color);
      border-radius : 0.75rem;
      margin-bottom: 1rem;
    }

    /* New styles for list view enhancement */
    .list-view-accordion {
      margin-top: 2rem;
    }

    ::ng-deep .list-view-accordion .mat-expansion-panel {
      background: var(--surface-color);
      border: 1px solid var(--border-color);
      border-radius: 12px !important; /* using important to override material styles */
      margin-bottom: 1.2rem;
      box-shadow: 0 1px 3px var(--shadow-color-light);
      transition: box-shadow 0.2s, border-color 0.2s;
    }

    ::ng-deep .list-view-accordion .mat-expansion-panel:hover {
      box-shadow: 0 4px 12px var(--shadow-color-light);
      border-color: var(--primary-color-light);
    }

    .list-view-panel-title {
      display: flex;
      align-items: center;
      width: 100%;
    }

    .list-view-panel-title .template-icon {
      color: var(--primary-color);
      margin-right: 1rem;
    }

    .list-view-panel-title .base-name {
      font-weight: 600;
      font-size: 1.2rem;
    }

    .version-count-badge {
      margin-left: auto;
      background-color: var(--primary-color-lightest);
      color: var(--primary-color);
      padding: 0.25rem 0.75rem;
      border-radius: 1rem;
      font-size: 0.9rem;
      font-weight: 600;
    }

    .list-view-table {
      display: flex;
      flex-direction: column;
    }

    .list-view-header, .list-view-row {
      display: grid;
      grid-template-columns: 1.2fr 1fr 1fr 1fr 1.5fr 1.5fr minmax(150px, auto);
      gap: 1rem;
      align-items: center;
      border-bottom: 1px solid var(--border-color);
      padding: 0.5rem 1rem;
    }

    .list-view-header {
      font-weight: 600;
      color: var(--text-secondary-color);
      font-size: 0.9em;
      text-transform: uppercase;
    }
    .list-view-header .list-cell {
      text-align: left !important;
    }
    .list-view-row:hover {
      background-color: var(--surface-hover-color);
    }

    .list-cell {
      padding: 0.5rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Center-align specific columns as requested */
    .list-cell:nth-child(2),
    .list-cell:nth-child(3),
    .list-cell:nth-child(4),
    .list-cell:nth-child(5),
    .list-cell:nth-child(6) {
      text-align: center;
    }

    .list-cell.actions-cell, .list-cell.actions-header {
      overflow: visible;
      white-space: normal;
      display: flex;
      justify-content: center; /* Center align actions */
      gap: 0.25rem;
    }

    .actions-header {
      justify-content: center;
      display: flex;
    }

    .clickable-schema {
      font-weight: 600;
      color: var(--text-color);
    }

    .list-cell.date-cell {
      font-size: 0.95rem;
    }

    .version-tag {
        display: inline-block;
        padding: 0.2rem 0.6rem;
        border-radius: 1rem;
        font-size: 0.85rem;
        font-weight: 600;
        background-color: var(--secondary-color);
        color: var(--on-secondary-color);
    }

    .team-search-bar {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .team-dropdown {
      min-width: 160px;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      border: 1px solid var(--border-color, #ccc);
      font-size: 1rem;
      background: var(--surface-color);
    }
    .dashboard-footer {
      display: flex;
      justify-content: center;
      padding: 2rem 0;
      border-top: 1px solid var(--border-color);
      margin-top: 2rem;
    }
  `]
})
export class DashboardComponent implements OnInit, AfterViewInit {
  allTemplates: TemplateInfo[] = [];
  groupedTemplates: { [baseName: string]: TemplateInfo[] } = {};
  baseNames: string[] = [];
  selectedTabIndex: number = 0;
  expandedBase: { [baseName: string]: boolean } = {};
  mode: 'list' | 'create' | 'edit' | 'preview' | 'use' | 'submissions' | 'history' = 'list';
  private modeHistory: string[] = ['list'];
  selectedTemplate: string | null = null;
  duplicatedVersion: number | null = null;
  prefillSubmissionName: string | null = null;
  displayMode: 'list' | 'grid' | 'tabcard' = 'tabcard';
  tabPage = 0;
  searchText: string = '';
  selectedTeam: string = '';
  teamNames: string[] = ['Framework Team', 'PID Team'];
  advancedSearch: boolean = false;
  filterDescription: string = '';
  filterAuthor: string = '';
  filterStartDate: string = '';
  filterEndDate: string = '';
  filterVersionTag: string = '';
  filterAuditPipeline: string = '';
  tabWindowStart = 0;
  tabWindowSize = 6;
  isLoading = false;
  get visibleBaseNames() {
    return this.baseNames.slice(this.tabWindowStart, this.tabWindowStart + this.tabWindowSize);
  }
  selectedTabIndexInWindow = 0;

  constructor(private schemaService: SchemaService, private router: Router) {}

  ngOnInit() {
    this.restoreDashboardState();
    this.loadTemplates();
  }

  ngAfterViewInit() {
    setTimeout(() => this.restoreScroll(), 0);
  }

  // --- State Persistence ---
  saveDashboardState() {
    sessionStorage.setItem('dashboardTab', this.selectedTabIndexInWindow.toString());
    sessionStorage.setItem('dashboardSearch', this.searchText);
    sessionStorage.setItem('dashboardAdvanced', JSON.stringify({
      advancedSearch: this.advancedSearch,
      filterDescription: this.filterDescription,
      filterAuthor: this.filterAuthor,
      filterStartDate: this.filterStartDate,
      filterEndDate: this.filterEndDate,
      filterVersionTag: this.filterVersionTag,
      filterAuditPipeline: this.filterAuditPipeline
    }));
    sessionStorage.setItem('dashboardDisplayMode', this.displayMode);
    sessionStorage.setItem('dashboardTabWindowStart', this.tabWindowStart.toString());
    sessionStorage.setItem('dashboardScroll', window.scrollY.toString());
    if (this.selectedTemplate) {
      sessionStorage.setItem('dashboardSelectedTemplate', this.selectedTemplate);
    }
  }

  restoreDashboardState() {
    const tab = sessionStorage.getItem('dashboardTab');
    if (tab) this.selectedTabIndexInWindow = +tab;
    const search = sessionStorage.getItem('dashboardSearch');
    if (search) this.searchText = search;
    const adv = sessionStorage.getItem('dashboardAdvanced');
    if (adv) {
      const advObj = JSON.parse(adv);
      this.advancedSearch = advObj.advancedSearch;
      this.filterDescription = advObj.filterDescription;
      this.filterAuthor = advObj.filterAuthor;
      this.filterStartDate = advObj.filterStartDate;
      this.filterEndDate = advObj.filterEndDate;
      this.filterVersionTag = advObj.filterVersionTag;
      this.filterAuditPipeline = advObj.filterAuditPipeline;
    }
    const mode = sessionStorage.getItem('dashboardDisplayMode');
    if (mode) this.displayMode = mode as any;
    const tabWin = sessionStorage.getItem('dashboardTabWindowStart');
    if (tabWin) this.tabWindowStart = +tabWin;
    // Restore selected template and adjust tab index/window if needed
    const selectedTemplate = sessionStorage.getItem('dashboardSelectedTemplate');
    if (selectedTemplate && this.displayMode === 'tabcard' && this.baseNames.length > 0) {
      // Find which baseName and tab window contains the selected template
      let found = false;
      for (let i = 0; i < this.baseNames.length; i++) {
        const base = this.baseNames[i];
        const versions = this.groupedTemplates[base] || [];
        if (versions.some(v => v.name === selectedTemplate)) {
          // Find which window the tab is in
          const tabWindowSize = this.tabWindowSize || 6;
          const tabIndex = i;
          this.selectedTabIndexInWindow = tabIndex % tabWindowSize;
          this.tabWindowStart = tabIndex - this.selectedTabIndexInWindow;
          found = true;
          break;
        }
      }
      if (!found) {
        this.selectedTabIndexInWindow = 0;
        this.tabWindowStart = 0;
      }
    }
  }

  restoreScroll() {
    const scroll = sessionStorage.getItem('dashboardScroll');
    if (scroll) window.scrollTo(0, +scroll);
  }

  // --- Save state before navigation ---
  useTemplate(template: string) {
    this.saveDashboardState();
    this.selectedTemplate = template;
    this.mode = 'use';
    this.modeHistory.push('use');
  }
  editTemplate(template: TemplateInfo) {
    this.saveDashboardState();
    this.selectedTemplate = template.name;
    this.mode = 'edit';
    this.modeHistory.push('edit');
  }
  previewTemplate(template: string) {
    this.saveDashboardState();
    this.selectedTemplate = template;
    this.mode = 'preview';
    this.modeHistory.push('preview');
  }
  viewSubmissions(template: string) {
    this.saveDashboardState();
    this.selectedTemplate = template;
    this.mode = 'submissions';
    this.modeHistory.push('submissions');
  }
  viewSchemaVersions(name: string) {
    this.saveDashboardState();
    this.selectedTemplate = name;
    this.mode = 'edit';
    this.modeHistory.push('edit');
  }
  viewHistory(name: string) {
    this.saveDashboardState();
    this.selectedTemplate = name;
    this.mode = 'history';
    this.modeHistory.push('history');
  }
  // --- Clear state on reset/clear ---
  clearSearch() {
    this.searchText = '';
    this.filterDescription = '';
    this.filterAuthor = '';
    this.filterStartDate = '';
    this.filterEndDate = '';
    this.filterVersionTag = '';
    this.filterAuditPipeline = '';
    sessionStorage.removeItem('dashboardSearch');
    sessionStorage.removeItem('dashboardAdvanced');
    this.applyFilters();
  }
  resetFilters() {
    this.searchText = '';
    this.filterDescription = '';
    this.filterAuthor = '';
    this.filterStartDate = '';
    this.filterEndDate = '';
    this.filterVersionTag = '';
    this.filterAuditPipeline = '';
    sessionStorage.clear();
    this.applyFilters();
  }

  isFormMode(): boolean {
    return this.mode === 'create' || this.mode === 'edit' || this.mode === 'preview' || this.mode === 'use';
  }

  loadTemplates() {
    if (this.isLoading) return; // Prevent multiple simultaneous loads
    this.isLoading = true;
    this.schemaService.listTemplates().subscribe({
      next: (templates) => {
        this.allTemplates = templates;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading templates:', error);
        this.isLoading = false;
      }
    });
  }

  applyFilters() {
    let filtered = this.allTemplates;
    const search = this.searchText.trim().toLowerCase();
    if (search) {
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(search) ||
        (t.description && t.description.toLowerCase().includes(search)) ||
        (t.author && t.author.toLowerCase().includes(search))
      );
    }
    if (this.selectedTeam) {
      filtered = filtered.filter(t => t.team_name === this.selectedTeam);
    }
    if (this.advancedSearch) {
      if (this.filterDescription.trim()) {
        const desc = this.filterDescription.trim().toLowerCase();
        filtered = filtered.filter(t => t.description && t.description.toLowerCase().includes(desc));
      }
      if (this.filterAuthor.trim()) {
        const author = this.filterAuthor.trim().toLowerCase();
        filtered = filtered.filter(t => {
          // Handle cases where author might be null, undefined, or empty
          const templateAuthor = (t.author || '').toLowerCase();
          return templateAuthor.includes(author);
        });
      }
      if (this.filterVersionTag.trim()) {
        const versionTag = this.filterVersionTag.trim().toLowerCase();
        filtered = filtered.filter(t => (t.version_tag || '').toLowerCase().includes(versionTag));
      }
      if (this.filterAuditPipeline.trim()) {
        const auditPipeline = this.filterAuditPipeline.trim().toLowerCase();
        filtered = filtered.filter(t => (t.audit_pipeline || '').toLowerCase().includes(auditPipeline));
      }
      if (this.filterStartDate) {
        filtered = filtered.filter(t => {
          const templateDate = new Date(t.created_at);
          const startDate = new Date(this.filterStartDate);
          return templateDate >= startDate;
        });
      }
      if (this.filterEndDate) {
        filtered = filtered.filter(t => {
          const templateDate = new Date(t.created_at);
          const endDate = new Date(this.filterEndDate);
          endDate.setHours(23, 59, 59, 999); // Include the entire end date
          return templateDate <= endDate;
        });
      }
    }
    
    // Group templates by base name
    this.groupedTemplates = {};
    for (const t of filtered) {
      const match = t.name.match(/^(.*)_v\d+$/);
      const base = match ? match[1] : t.name;
      if (!this.groupedTemplates[base]) this.groupedTemplates[base] = [];
      this.groupedTemplates[base].push(t);
    }
    this.baseNames = Object.keys(this.groupedTemplates).sort();
    for (const base of this.baseNames) {
      this.groupedTemplates[base].sort((a, b) => {
        const va = parseInt(a.name.split('_v').pop() || '0', 10);
        const vb = parseInt(b.name.split('_v').pop() || '0', 10);
        return va - vb;
      });
    }
    
    // Only reset tab window if we're not restoring state
    const isRestoring = sessionStorage.getItem('dashboardSelectedTemplate');
    if (!isRestoring) {
      this.tabWindowStart = 0;
      this.selectedTabIndexInWindow = 0;
    }
  }

  toggleExpand(baseName: string) {
    this.expandedBase[baseName] = !this.expandedBase[baseName];
  }

  showCreateTemplate() {
    this.saveDashboardState();
    this.selectedTemplate = null;
    this.duplicatedVersion = null;
    this.prefillSubmissionName = null;
    this.mode = 'create';
    this.modeHistory.push('create');
  }

  onFormClose() {
    if (this.modeHistory.length > 1) {
      this.modeHistory.pop();
    }
    this.mode = (this.modeHistory[this.modeHistory.length - 1] || 'list') as any;

    // Reset form-specific data
    this.duplicatedVersion = null;
    this.prefillSubmissionName = null;

    if (this.mode === 'list') {
      this.selectedTemplate = null;
      this.restoreDashboardState();
      // A small delay to allow the view to switch and elements to be available
      setTimeout(() => {
        this.restoreScroll();
        // After restoring, we can clear the selected template from session storage
        sessionStorage.removeItem('dashboardSelectedTemplate');
      }, 50);
    }
  }

  getTemplateDesc(template: string): string | null {
    const t = this.allTemplates.find(t => t.name === template);
    return t ? t.description : null;
  }

  getTemplateMeta(template: string): string | null {
    const t = this.allTemplates.find(t => t.name === template);
    return t ? t.created_at : null;
  }

  onDuplicateEdit(event: { template: string, submissionName: string }) {
    this.saveDashboardState();
    this.mode = 'use';
    this.selectedTemplate = event.template;
    this.prefillSubmissionName = event.submissionName;
    this.modeHistory.push('use');
  }

  openDatePicker(input: HTMLInputElement) {
    try {
      input.showPicker();
    } catch (e) {
      // Handle the case where showPicker() is not supported
      input.focus();
    }
  }

  // Add scrollTabWindow method for windowed tab navigation
  scrollTabWindow(direction: 'left' | 'right') {
    if (direction === 'left' && this.tabWindowStart > 0) {
      this.tabWindowStart--;
    } else if (direction === 'right' && (this.tabWindowStart + this.tabWindowSize) < this.baseNames.length) {
      this.tabWindowStart++;
    }
  }

  get showTabScrollLeft() {
    return this.baseNames.length > this.tabWindowSize && this.tabWindowStart > 0;
  }
  get showTabScrollRight() {
    return this.baseNames.length > this.tabWindowSize && (this.tabWindowStart + this.tabWindowSize) < this.baseNames.length;
  }

  toggleAdvancedSearch() {
    this.advancedSearch = !this.advancedSearch;
    this.applyFilters();
  }

  deleteTemplate(template: string) {
    if (confirm(`Are you sure you want to delete ${template}? This will delete all versions and submissions.`)) {
      this.schemaService.deleteTemplate(template).subscribe(() => {
        this.loadTemplates();
      });
    }
  }

  navigateToHelpdesk() {
    this.router.navigate(['/helpdesk']);
  }
}
