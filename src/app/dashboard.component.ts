import { CommonModule, NgIf, NgFor } from '@angular/common';
import { Component, OnInit, AfterViewInit, Input, Output, EventEmitter, SimpleChanges, OnChanges, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, ActivatedRoute } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { DynamicForm } from './dynamic-form/dynamic-form.component';
import { SchemaService, TemplateInfo } from './dynamic-form/schema.service';
import { SubmissionsViewerComponent } from './submissions-viewer.component';
import { TemplateHistoryComponent } from './template-history/template-history.component';
import { AnimatedPopupComponent } from './animated-popup.component';
import { InteractiveDialogComponent } from './interactive-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { UploadConfigDialogComponent } from './upload-config-dialog.component';
import { MatDialogModule } from '@angular/material/dialog';
import { mapConfToPrefill } from './dynamic-form/conf-parser';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, DynamicForm, SubmissionsViewerComponent, MatIconModule, MatTooltipModule, MatButtonModule, FormsModule, MatTabsModule, MatExpansionModule, TemplateHistoryComponent, AnimatedPopupComponent, MatListModule, MatFormFieldModule, MatInputModule, MatDialogModule],
  template: `
    <div class="container">
      
      <div *ngIf="mode === 'list'">
        <header class="dashboard-header" style="display: flex; align-items: center; width: 100%; max-width: 100vw; overflow-x: hidden; box-sizing: border-box;">
          <div style="flex: 0 0 auto; margin-left: 5px;">
            <button mat-stroked-button color="primary"   class="upload-config-btn" (click)="goToLaunchpad()">
              <mat-icon>arrow_back</mat-icon>
              Back to Launchpad
            </button>
          </div>
          <div style="flex: 1 1 0; text-align: center; margin-left: 15em; min-width: 0;">
            <h1 style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ isFrameworkTeam ? 'Configuration Template Generator and Management' : 'Configuration File Generator' }}</h1>
            <p class="subtitle" *ngIf="!isFrameworkTeam">Use and Fill out your Configuration files.</p>
            <p class="subtitle" *ngIf="isFrameworkTeam">Manage, edit, and create templates for the framework team</p>
          </div>
          <div style="flex: 0 0 auto; margin-right: 5px; display: flex; gap: 0.5rem; align-items: center;">
            <button *ngIf="!isFrameworkTeam" 
                    mat-raised-button 
                    color="accent" 
                    class="upload-config-btn"
                    (click)="openUploadConfigDialogCommon()"
                    matTooltip="Upload and validate a configuration file">
              <mat-icon>upload_file</mat-icon>
              <span>Upload Config File</span>
            </button>

            <button *ngIf="!isFrameworkTeam"  class="upload-config-btn" mat-stroked-button color="accent" (click)="navigate.emit({ view: 'search-by-filler' })">
              <mat-icon>search</mat-icon>
              config by User
            </button>
            <button *ngIf="isFrameworkTeam" mat-raised-button color="primary" class="big-create-btn" (click)="showCreateTemplate()" style="height: 52px; min-width: 220px; border-radius: 28px; box-shadow: 0 2px 12px rgba(23,78,166,0.10); display: flex; align-items: center; gap: 0.7rem; font-size: 1.18rem; font-weight: 600; letter-spacing: 0.01em;">
              <mat-icon style="font-size: 2.2rem;">add</mat-icon>
              <span class="btn-title" style="font-size: 1.18rem; font-weight: 600;">Create New Template</span>
            </button>
          </div>
        </header>
        <div class="filter-bar card modern-search-bar team-search-bar">
          <div style="position: relative; display: flex; align-items: center;">
            <input type="text" class="team-dropdown" placeholder="Team contains..." [(ngModel)]="selectedTeam" (input)="applyFilters()">
            <button *ngIf="selectedTeam" mat-icon-button class="clear-input-btn" style="position: absolute; right: 0.3rem;" (click)="selectedTeam=''; applyFilters()" tabindex="-1">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <div style="position: relative; display: flex; align-items: center; flex: 1;">
            <input
              type="text"
              class="main-search-input"
              placeholder="Search templates..."
              [(ngModel)]="searchText"
              (keyup.enter)="applyFilters()"
              (input)="applyFilters()"
              style="padding-right: 2.5rem;"
            >
            <button
              mat-icon-button
              class="search-icon-btn"
              style="position: absolute; right: 0.3rem; top: 50%; transform: translateY(-50%);"
              (click)="searchText ? clearSearch() : null"
              [attr.aria-label]="searchText ? 'Clear search' : 'Search'"
              tabindex="0"
            >
              <span *ngIf="!searchText" class="search-emoji">🔍</span>
              <mat-icon *ngIf="searchText">close</mat-icon>
            </button>
          </div>
          <button
            mat-stroked-button
              class="upload-config-btn"
            (click)="toggleAdvancedSearch()"
            [class.active]="advancedSearch"
          >
            <mat-icon>tune</mat-icon>
            <span>Advanced Search</span>
          </button>
        </div>
        <div *ngIf="advancedSearch" class="advanced-fields card">
          <div style="position: relative;width: 350px; display: flex; align-items: center;">
            <input
              type="text"
              class="filter-input"
              placeholder="Description contains..."
              [(ngModel)]="filterDescription"
              (input)="applyFilters()"
            >
            <button *ngIf="filterDescription" mat-icon-button class="clear-input-btn" style="position: absolute; right: 0.3rem;" (click)="filterDescription=''; applyFilters()" tabindex="-1">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <div style="position: relative; width: 350px;display: flex; align-items: center;">
            <input
              type="text"
              class="filter-input"
              placeholder="Author name contains..."
              [(ngModel)]="filterAuthor"
              (input)="applyFilters()"
            >
            <button *ngIf="filterAuthor" mat-icon-button class="clear-input-btn" style="position: absolute; right: 0.3rem;" (click)="filterAuthor=''; applyFilters()" tabindex="-1">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <div style="position: relative;width: 350px; display: flex; align-items: center;">
            <input
              type="text"
              class="filter-input"
              placeholder="Version tag contains..."
              [(ngModel)]="filterVersionTag"
              (input)="applyFilters()"
            >
            <button *ngIf="filterVersionTag" mat-icon-button class="clear-input-btn" style="position: absolute; right: 0.3rem;" (click)="filterVersionTag=''; applyFilters()" tabindex="-1">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <div style="position: relative;width: 350px; display: flex; align-items: center;">
            <input
              type="text"
              class="filter-input"
              placeholder="Audit pipeline contains..."
              [(ngModel)]="filterAuditPipeline"
              (input)="applyFilters()"
            >
            <button *ngIf="filterAuditPipeline" mat-icon-button class="clear-input-btn" style="position: absolute; right: 0.3rem;" (click)="filterAuditPipeline=''; applyFilters()" tabindex="-1">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <div class="date-range-filter">
            <div class="date-input-group" style="position: relative; display: flex; align-items: center;">
              <input #startDateInput type="date" class="filter-input" [(ngModel)]="filterStartDate" (change)="applyFilters()">
              <button mat-icon-button tabindex="-1" class="calendar-btn" matTooltip="Pick start date" type="button"
                *ngIf="!filterStartDate" (click)="openDatePicker(startDateInput)">
                <mat-icon>calendar_today</mat-icon>
              </button>
              <button mat-icon-button tabindex="-1" class="calendar-btn" matTooltip="Clear start date" type="button"
                *ngIf="filterStartDate" (click)="filterStartDate=''; applyFilters()" tabindex="-1">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <span class="date-range-separator">to</span>
            <div class="date-input-group" style="position: relative; display: flex; align-items: center;">
              <input #endDateInput type="date" class="filter-input" [(ngModel)]="filterEndDate" (change)="applyFilters()">
              <button mat-icon-button tabindex="-1" class="calendar-btn" matTooltip="Pick end date" type="button"
                *ngIf="!filterEndDate" (click)="openDatePicker(endDateInput)">
                <mat-icon>calendar_today</mat-icon>
              </button>
              <button mat-icon-button tabindex="-1" class="calendar-btn" matTooltip="Clear end date" type="button"
                *ngIf="filterEndDate" (click)="filterEndDate=''; applyFilters()" tabindex="-1">
                <mat-icon>close</mat-icon>
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
                        <!-- Application team: view, fill, submissions, upload config -->
                        <button mat-icon-button (click)="previewTemplate(version.name)" matTooltip="Preview Form" *ngIf="!isFrameworkTeam">
                          <mat-icon fontIcon="visibility" class="action-icon"></mat-icon>
                        </button>
                        <button mat-icon-button (click)="useTemplate(version.name)" matTooltip="Fill Out Form" *ngIf="!isFrameworkTeam">
                          <mat-icon fontIcon="dynamic_form" class="action-icon"></mat-icon>
                        </button>
                        <button mat-icon-button (click)="viewSubmissions(version.name)" matTooltip="View Submissions" *ngIf="!isFrameworkTeam">
                          <mat-icon fontIcon="list_alt" class="action-icon"></mat-icon>
                        </button>
                        <!-- Framework team: edit, history, view, delete -->
                        <button mat-icon-button (click)="editTemplate(version)" matTooltip="Edit Template" *ngIf="isFrameworkTeam">
                          <mat-icon fontIcon="edit" class="action-icon"></mat-icon>
                        </button>
                        <button mat-icon-button (click)="viewHistory(version.name)" matTooltip="View History" *ngIf="isFrameworkTeam">
                          <mat-icon fontIcon="history" class="action-icon"></mat-icon>
                        </button>
                        <button mat-icon-button (click)="previewTemplate(version.name)" matTooltip="Preview Form" *ngIf="isFrameworkTeam">
                          <mat-icon fontIcon="visibility" class="action-icon"></mat-icon>
                        </button>
                        <button mat-icon-button (click)="deleteTemplate(version.name)" matTooltip="Delete Template" *ngIf="isFrameworkTeam">
                          <mat-icon fontIcon="delete" class="action-icon action-delete"></mat-icon>
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
              
              <div class="list-view-table" *ngIf="groupedTemplates[baseName]?.length" >
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
                      <!-- Application team: view, fill, submissions, upload config -->
                      <button mat-icon-button (click)="previewTemplate(version.name)" matTooltip="Preview Form" *ngIf="!isFrameworkTeam">
                        <mat-icon fontIcon="visibility" class="action-icon"></mat-icon>
                      </button>
                      <button mat-icon-button (click)="useTemplate(version.name)" matTooltip="Fill Out Form" *ngIf="!isFrameworkTeam">
                        <mat-icon fontIcon="dynamic_form" class="action-icon"></mat-icon>
                      </button>
                      <button mat-icon-button (click)="viewSubmissions(version.name)" matTooltip="View Submissions" *ngIf="!isFrameworkTeam">
                        <mat-icon fontIcon="list_alt" class="action-icon"></mat-icon>
                      </button>
                      <!-- Framework team: edit, history, view, delete -->
                      <button mat-icon-button (click)="editTemplate(version)" matTooltip="Edit Template" *ngIf="isFrameworkTeam">
                        <mat-icon fontIcon="edit" class="action-icon"></mat-icon>
                      </button>
                      <button mat-icon-button (click)="viewHistory(version.name)" matTooltip="View History" *ngIf="isFrameworkTeam">
                        <mat-icon fontIcon="history" class="action-icon"></mat-icon>
                      </button>
                      <button mat-icon-button (click)="previewTemplate(version.name)" matTooltip="Preview Form" *ngIf="isFrameworkTeam">
                        <mat-icon fontIcon="visibility" class="action-icon"></mat-icon>
                      </button>
                      <button mat-icon-button (click)="deleteTemplate(version.name)" matTooltip="Delete Template" *ngIf="isFrameworkTeam">
                        <mat-icon fontIcon="delete" class="action-icon action-delete"></mat-icon>
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
          [templateName]="selectedTemplate"
          [prefillSubmissionData]="prefillSubmissionData"
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
        <app-template-history></app-template-history>
      </div>

      <div class="dashboard-footer">
        <button mat-stroked-button (click)="navigateToHelpdesk()">
          <mat-icon>help_outline</mat-icon>
          <span>Helpdesk</span>
        </button>
      </div>

      <!-- Popup for success/error messages -->
      <app-animated-popup
        *ngIf="popupVisible"
        [message]="popupMessage"
        [type]="popupType"
        [visible]="popupVisible"
        (closed)="popupVisible = false"
      ></app-animated-popup>
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
  padding: 2rem 2.5rem;
  box-shadow: 0 4px 24px var(--shadow-color-dark);
  background-color: var(--surface-color);
  position: relative;
  height: 160px; /* Increased fixed height for better spacing */
  overflow: hidden; /* Prevent any scrolling */
  box-sizing: border-box; /* Ensure padding is included in height */
}

.dashboard-header h1 {
  margin-bottom: 0;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: 40px; /* Positioned from top */
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: calc(100% - 400px);
  font-size: 1.5rem;
  line-height: 1.2;
}

.subtitle {
  margin: 0;
  color: var(--text-muted-color);
  font-size: 1.1rem;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: 95px; /* Increased gap - 55px below h1 for more vertical space */
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: calc(100% - 400px);
  line-height: 1.2;
}

.dashboard-header button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  position: relative;
  z-index: 1;
}

/* Ensure the middle div doesn't interfere with centering */
.dashboard-header > div:nth-child(2) {
  position: static;
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
        align-items: center; /* Changed from flex-start to center for vertical alignment */
        gap: 1.7rem;
        margin-bottom: 1.2rem;
        min-height: 3.5rem; /* Ensure enough height for large icon */
    }
    .template-icon {
        font-size: 3.2rem;
        margin-top: 0; /* Remove margin-top to avoid cutting off icon */
        margin-left: 0.2rem;
        color: var(--primary-color);
        flex-shrink: 0;
        display: flex;
        align-items: center;
        height: 3.2rem; /* Ensure icon is not cut off */
        width: 3.2rem;
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
      min-width: 400px;
      
      max-width: 480px;
      flex: 1 1 400px;
      padding: 2.2rem;
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

    .dark-theme select.team-dropdown,
    .dark-theme select.team-dropdown option {
      color: rgb(255, 255, 255);
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
      display: table;
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
    }

    .list-view-header, .list-view-row {
      display: table-row;
      background: none;
      border-radius: 0;
      padding: 0;
      gap: 0;
      align-items: unset;
    }

    .list-view-header {
      font-weight: 600;
      color: var(--text-muted-color);
      font-size: 0.9em;
      text-transform: uppercase;
      background: var(--background-color, #F0F8FC);
      border-radius: 0.5rem 0.5rem 0 0;
      border-bottom: 2px solid var(--border-color, #C2D6E5);
      margin-bottom: 0;
    }

    .list-view-header .list-cell,
    .list-view-row .list-cell {
      display: table-cell;
      padding: 0.5rem 1rem;
      vertical-align: middle;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      border-bottom: 1px solid var(--border-color, #C2D6E5);
    }

    .list-view-header .list-cell {
      text-align: center !important;
      background: var(--background-color, #F0F8FC);
      font-weight: 600;
      border-bottom: 2px solid var(--border-color, #C2D6E5);
    }

    .list-view-row .list-cell {
      background: var(--surface-color, #fff);
      text-align: center;
      transition: background 0.18s, color 0.18s;
      color: var(--text-color, #1E2F3C);
    }

    .dark-theme .list-view-row .list-cell {
      background: var(--surface-color, #1A2A36);
      color: var(--text-color, #DDE9F2);
    }
    .dashboard-footer {
      display: flex;
      justify-content: center;
      padding: 2rem 0;
      border-top: 1px solid var(--border-color);
      margin-top: 2rem;
    }

    /* Styles for animated popup */
    .animated-popup {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      padding: 1rem 1.5rem;
      border-radius: 0.75rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      gap: 0.75rem;
      animation: slideIn 0.4s ease-out, fadeOut 0.4s ease-out 1.6s forwards;
    }
    .animated-popup.success {
      background-color: rgba(76, 175, 80, 0.1);
      border: 1px solid rgba(76, 175, 80, 0.3);
    }
    .animated-popup.error {
      background-color: rgba(244, 67, 54, 0.1);
      border: 1px solid rgba(244, 67, 54, 0.3);
    }
    .animated-popup.airplane {
      background-color: rgba(33, 150, 243, 0.1);
      border: 1px solid rgba(33, 150, 243, 0.3);
    }
    .popup-content {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .popup-icon {
      font-size: 1.5rem;
      line-height: 1;
    }
    .popup-message {
      font-size: 1rem;
      color: var(--text-color);
    }
      .list-cell.actions-cell button {
  transition: background 0.18s, color 0.18s, box-shadow 0.18s, transform 0.18s;
  box-shadow: none;
  gap: 0.5rem; 
  width: 48px;
  height: 48px;
  min-width: 48px;
  min-height: 48px;
  font-size: 1.5rem;
    display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: transparent;
  color: inherit;
}
.list-cell.actions-cell button:hover:not(.action-delete) {
  background:rgb(85, 176, 89) !important; /* Green 600 */
  color: rgb(0, 0, 0) !important;
  box-shadow: 0 2px 8px rgba(67,160,71,0.18);
  transform: scale(1.13);
}
.list-cell.actions-cell button:hover:not(.action-delete) .mat-icon {
  color: rgb(0, 0, 0) !important;
}
.list-cell.actions-cell button.action-delete:hover {
  background:rgb(173, 74, 74) !important; /* Red 600 */
  color:rgb(0, 0, 0) !important;
  box-shadow: 0 2px 8px rgba(229,57,53,0.18);
  transform: scale(1.13);
}
.list-cell.actions-cell button.action-delete:hover .mat-icon {
  color: rgb(0, 0, 0) !important;
}

    @keyframes slideIn {
      0% {
        transform: translateY(-10px);
        opacity: 0;
      }
      100% {
        transform: translateY(0);
        opacity: 1;
      }
    }
    @keyframes fadeOut {
      0% {
        opacity: 1;
      }
      100% {
        opacity: 0;
      }
    }
    .version-card .template-title-group {
  display: flex;
  align-items: center; /* Changed from flex-start to center for vertical alignment */
  gap: 1.7rem;
  margin-bottom: 1.2rem;
  min-height: 3.5rem; /* Ensure enough height for large icon */
}
.version-card .template-icon {
  font-size: 3.2rem;
  margin-top: 0; /* Remove margin-top to avoid cutting off icon */
  margin-left: 0.2rem;
  color: var(--primary-color);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  height: 3.2rem; /* Ensure icon is not cut off */
  width: 3.2rem;
}
.version-card h3 {
  font-size: 1.35rem;
  font-weight: 700;
  margin-bottom: 0.4rem;
}
.version-card .template-desc {
  color: var(--text-muted-color);
  font-size: 1.13rem;
  margin: 0.18rem 0 0.18rem 0;
}
.version-card .template-meta {
  font-size: 1.05rem;
  gap: 0.7rem;
}
.big-create-btn {
  min-width: 220px;
  min-height: 80px;
  width: 260px;
  height: 80px;
  border-radius: 1.2rem;
  font-size: 1.3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(106, 170, 223, 0.2);
  margin-left: 1.5rem;
  margin-top: 0.5rem;
  padding: 0;
  background: linear-gradient(135deg, rgb(106, 170, 223) 0%, rgb(86, 150, 203) 100%);
  position: relative;
  overflow: hidden;
  transition: background 0.22s, box-shadow 0.18s;
}

.big-create-btn mat-icon {
  display: none;
}

.big-create-btn span {
  color: white;
  font-size: 1.3rem;
  font-weight: 600;
  margin-left: 0.5rem;
  z-index: 2;
  position: relative;
  transition: color 0.18s, transform 0.32s cubic-bezier(.4,2,.6,1), opacity 0.22s;
  opacity: 1;
  transform: translateY(0);
  display: inline-block;
}

.big-create-btn::after {
  content: '+';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0.7);
  font-size: 2.5rem;
  color: white;
  opacity: 0;
  pointer-events: none;
  z-index: 1;
  transition: font-size 0.22s, opacity 0.22s, color 0.22s;
}

.big-create-btn:hover, .big-create-btn:focus {
  background: linear-gradient(135deg, rgb(96, 160, 213) 0%, rgb(76, 140, 193) 100%);
  box-shadow: 0 6px 20px rgba(106, 170, 223, 0.4);
  outline: none;
}

.big-create-btn:hover span, .big-create-btn:focus span {
  opacity: 0;
  transform: translateY(40px);
  pointer-events: none;
}

.big-create-btn:hover::after, .big-create-btn:focus::after {
  font-size: 5.5rem;
  opacity: 1;
  color: white;
}

/* Dark mode styles */
.dark-theme .big-create-btn {
  background: linear-gradient(135deg, rgb(86, 150, 203) 0%, rgb(66, 130, 183) 100%);
  box-shadow: 0 4px 24px rgba(106, 170, 223, 0.3);
}

.dark-theme .big-create-btn span {
  color: white;
}

.dark-theme .big-create-btn::after {
  color: white;
}

.dark-theme .big-create-btn:hover, .dark-theme .big-create-btn:focus {
  background: linear-gradient(135deg, rgb(76, 140, 193) 0%, rgb(56, 120, 173) 100%);
  box-shadow: 0 6px 24px rgba(106, 170, 223, 0.4);
}

.dark-theme .big-create-btn:hover::after, .dark-theme .big-create-btn:focus::after {
  color: white;
}

  `]
})
export class DashboardComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  @Input() team: 'application' | 'framework' = 'application';
  @Output() navigate = new EventEmitter<any>();
  @Output() back = new EventEmitter<void>();
  
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
  prefillSubmissionData: any = null;
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
  buttonHover = false;
  isFrameworkTeam = false;
  private destroy$ = new Subject<void>();

  constructor(private schemaService: SchemaService, private router: Router, private dialog: MatDialog, private route: ActivatedRoute) {}

  ngOnInit() {
    this.isFrameworkTeam = this.team === 'framework';
    this.loadTemplates();
    this.restoreDashboardState();
  }

  ngAfterViewInit() {
    setTimeout(() => this.restoreScroll(), 0);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['team']) {
      this.isFrameworkTeam = this.team === 'framework';
    }
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
    this.navigate.emit({ view: 'form', mode: 'use', templateName: template });
  }
  editTemplate(template: TemplateInfo) {
    this.navigate.emit({ view: 'form', mode: 'edit', templateName: template.name });
  }
  previewTemplate(template: string) {
    this.navigate.emit({ view: 'form', mode: 'preview', templateName: template });
  }
  viewSubmissions(template: string) {
    this.navigate.emit({ view: 'submissions', templateName: template });
  }
  viewSchemaVersions(name: string) {
    this.navigate.emit({ view: 'form', mode: 'edit', templateName: name });
  }
  viewHistory(name: string) {
    this.navigate.emit({ view: 'history', templateName: name });
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
    this.schemaService.listTemplates()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
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
    if (this.selectedTeam.trim()) {
  const team = this.selectedTeam.trim().toLowerCase();
  filtered = filtered.filter(t => (t.team_name || '').toLowerCase().includes(team));
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
    this.navigate.emit({ view: 'form', mode: 'create' });
  }

  onFormClose() {
    this.mode = 'list';
    this.selectedTemplate = null;
    this.duplicatedVersion = null;
    this.prefillSubmissionName = null;
    this.restoreDashboardState();
  }

  getTemplateDesc(template: string): string | null {
    const t = this.allTemplates.find(t => t.name === template);
    return t ? t.description : null;
  }

  getTemplateMeta(template: string): string | null {
    const t = this.allTemplates.find(t => t.name === template);
    return t ? t.created_at : null;
  }

  onDuplicateEdit(event: { template: string, prefillSubmissionData: any }) {
    this.mode = 'use';
    this.selectedTemplate = event.template;
    this.prefillSubmissionData = event.prefillSubmissionData;
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

  async deleteTemplate(template: string) {
    const dialogRef = this.dialog.open(InteractiveDialogComponent, {
      width: '700px',
      data: {
        title: 'Delete Template',
        message: `Are you sure you want to delete ${template}? This will delete all versions and submissions.`,
        type: 'confirm'
      }
    });
    const result = await dialogRef.afterClosed().toPromise();
    if (result) {
      this.schemaService.deleteTemplate(template).subscribe(() => {
        this.showPopup('Template deleted successfully!', 'success',1800);
      });
    }
  }
  popupMessage: string = '';
  popupType: 'success' | 'error' | 'airplane' = 'success';
  popupVisible = false;

  // added timeout parameter to allow custom timeout
  showPopup(message: string, type: 'success' | 'error' | 'airplane' = 'success', timeout: number = 1800){
    this.popupMessage = message;
    this.popupType = type;
    this.popupVisible = true;
    setTimeout(() => {
      this.popupVisible = false;
      window.location.reload();
    }, timeout);
  }

  navigateToHelpdesk() {
    this.navigate.emit({ view: 'helpdesk' });
  }

  goToLaunchpad() {
    this.back.emit();
  }

  goToFilledByMe() {
    this.router.navigate(['/filled-by-me']);
  }

  onNavigate(event: any) {
    this.navigate.emit(event);
  }

openUploadConfigDialogCommon() {
  // Open dialog in generic mode (no template/version preselected)
  const dialogRef = this.dialog.open(UploadConfigDialogComponent, {
    width: '60vw',
    maxWidth: '65vw',
    height: 'auto',
    panelClass: ['centered-dialog', 'transparent-dialog'], // Add transparent class
    disableClose: true,
    hasBackdrop: true,
    backdropClass: 'transparent-backdrop', // Optional: customize backdrop
    data: { template: null }
  });
  
  dialogRef.afterClosed().subscribe(result => {
    if (!result) return;
    if (result.action === 'validate') {
      // TODO: Validate result.parsedData against selected schema and show result
      alert('Validation logic coming soon!');
    } else if (result.action === 'updateAndEdit') {
      // Instead of setting local state, emit to parent so app.ts can show form and header back button
      this.navigate.emit({
        view: 'form',
        mode: 'use',
        templateName: result.selectedVersionTag,
        prefillSubmissionData: result.prefillData
      });
    }
  });
}


  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
