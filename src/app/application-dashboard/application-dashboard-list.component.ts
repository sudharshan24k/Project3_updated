import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SchemaService, TemplateInfo } from '../dynamic-form/schema.service';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-application-dashboard-list',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatTooltipModule, MatDialogModule, FormsModule],
  template: `
    <div class="dashboard-list-container">
      <button mat-stroked-button color="primary" (click)="back.emit()" style="margin-bottom: 1.2rem;">
        <mat-icon>arrow_back</mat-icon>
        Back
      </button>
      <div class="expand-collapse-controls">
        <button mat-stroked-button color="primary" (click)="expandAll()" style="margin-right: 0.7rem;">
          <mat-icon>unfold_more</mat-icon> Expand All
        </button>
        <button mat-stroked-button color="primary" (click)="collapseAll()">
          <mat-icon>unfold_less</mat-icon> Collapse All
        </button>
      </div>
      <div *ngIf="loading" class="loading-spinner">
        <mat-icon class="spinning">refresh</mat-icon>
        <span>Loading templates...</span>
      </div>
      <div *ngIf="error && !loading" class="error-message">{{ error }}</div>
      <div *ngIf="!loading && !error">
        <div class="filter-bar card">
          <input type="text" class="main-search-input" placeholder="Filter by Name" [(ngModel)]="nameFilter" (input)="applyFilters()">
          <input type="text" class="main-search-input" placeholder="Filter by Description" [(ngModel)]="descFilter" (input)="applyFilters()">
          <input type="text" class="main-search-input" placeholder="Filter by Author" [(ngModel)]="authorFilter" (input)="applyFilters()">
          <input type="text" class="main-search-input" placeholder="Filter by Team" [(ngModel)]="teamFilter" (input)="applyFilters()">
          <input type="text" class="main-search-input" placeholder="Filter by Version" [(ngModel)]="versionFilter" (input)="applyFilters()">
          <input type="text" class="main-search-input" placeholder="Filter by Audit Pipeline" [(ngModel)]="auditFilter" (input)="applyFilters()">
          <button mat-icon-button (click)="clearAllFilters()" [attr.aria-label]="'Clear all filters'">
            <mat-icon>close</mat-icon>
          </button>
        </div>
        <div class="template-list">
          <div class="list-header">
            <div class="col-name">Template Name</div>
            <div class="col-desc">Description</div>
            <div class="col-author">Author</div>
            <div class="col-team">Team</div>
            <div class="col-version">FW_VERSION</div>
            <div class="col-date">Date Created</div>
            <div class="col-audit">Audit Pipeline</div>
            <div class="col-actions">Actions</div>
          </div>
          
          <div *ngFor="let baseName of Object.keys(groupedTemplates)" class="template-group">
            <div class="group-header" (click)="toggleGroup(baseName)" [class.expanded]="expandedGroups[baseName]">
              <div class="group-info">
                <mat-icon class="expand-icon" [class.expanded]="expandedGroups[baseName]">expand_more</mat-icon>
                <span class="group-name">{{ baseName }}</span>
                <span class="group-count">({{ groupedTemplates[baseName].length }} versions)</span>
              </div>
              <div class="group-actions">
                <button mat-icon-button (click)="editTemplate(getLatestTemplate(groupedTemplates[baseName])); $event.stopPropagation()" matTooltip="Edit Latest Version">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button (click)="previewTemplate(getLatestTemplate(groupedTemplates[baseName])); $event.stopPropagation()" matTooltip="Preview Latest Version">
                  <mat-icon>visibility</mat-icon>
                </button>
                <button mat-icon-button (click)="viewHistory(getLatestTemplate(groupedTemplates[baseName])); $event.stopPropagation()" matTooltip="View History">
                  <mat-icon>history</mat-icon>
                </button>
              </div>
            </div>
            
            <div class="group-content" *ngIf="expandedGroups[baseName]" [@expandCollapse]>
              <div *ngFor="let template of groupedTemplates[baseName]" class="template-row">
                <div class="col-name" [title]="template.name">
                  {{ template.name }}
                </div>
                <div class="col-desc" [title]="template.description">{{ template.description }}</div>
                <div class="col-author" [title]="template.author">{{ template.author }}</div>
                <div class="col-team" [title]="template.team_name">{{ template.team_name }}</div>
                <div class="col-version" [title]="template.version_tag">{{ template.version_tag }}</div>
                <div class="col-date" [title]="template.created_at">{{ formatDate(template.created_at) }}</div>
                <div class="col-audit" [title]="template.audit_pipeline">{{ template.audit_pipeline }}</div>
                <div class="col-actions">
                  <button mat-icon-button (click)="editTemplate(template)" matTooltip="Edit Template">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button (click)="previewTemplate(template)" matTooltip="Preview Template">
                    <mat-icon>visibility</mat-icon>
                  </button>
                  <button mat-icon-button (click)="viewHistory(template)" matTooltip="View History">
                    <mat-icon>history</mat-icon>
                  </button>
                  <button mat-icon-button color="warn" (click)="deleteTemplate(template)" matTooltip="Delete Template">
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div *ngIf="Object.keys(groupedTemplates).length === 0" class="no-templates">No templates found.</div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./application-dashboard-list.component.scss'],
  animations: [
    trigger('expandCollapse', [
      state('void', style({ height: '0', opacity: 0, padding: '0 2rem' })),
      state('*', style({ height: '*', opacity: 1, padding: '1rem 2rem 1rem 4rem' })),
      transition('void <=> *', [
        animate('250ms cubic-bezier(.4,0,.2,1)')
      ])
    ])
  ]
})
export class ApplicationDashboardListComponent implements OnInit {
  templates: TemplateInfo[] = [];
  filteredTemplates: TemplateInfo[] = [];
  teamNames: string[] = ['Framework Team', 'PID Team'];
  selectedTeam: string = '';
  searchText: string = '';
  loading = true;
  error = '';
  @Output() back = new EventEmitter<void>();
  @Output() navigate = new EventEmitter<any>();
  nameFilter: string = '';
  descFilter: string = '';
  authorFilter: string = '';
  teamFilter: string = '';
  versionFilter: string = '';
  auditFilter: string = '';
  groupedTemplates: { [key: string]: TemplateInfo[] } = {};
  expandedGroups: { [key: string]: boolean } = {};
  Object = Object;

  constructor(private schemaService: SchemaService, private router: Router, private dialog: MatDialog) {}

  ngOnInit() {
    this.loading = true;
    this.error = '';
    this.schemaService.listTemplates().subscribe({
      next: (templates) => {
        this.templates = templates;
        this.filteredTemplates = templates;
        this.teamNames = Array.from(new Set(templates.map(t => t.team_name).filter(Boolean)));
        this.groupTemplates();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load templates. Please check your backend/API.';
        this.loading = false;
      }
    });
  }

  groupTemplates() {
    this.groupedTemplates = {};
    this.filteredTemplates.forEach(template => {
      const baseName = this.getBaseName(template.name);
      if (!this.groupedTemplates[baseName]) {
        this.groupedTemplates[baseName] = [];
        this.expandedGroups[baseName] = false; // Default to collapsed
      }
      this.groupedTemplates[baseName].push(template);
    });
  }

  getBaseName(fullName: string): string {
    // Remove _v1, _v2, _v3, etc. from the end of the name
    return fullName.replace(/_\w+\d*$/, '');
  }

  toggleGroup(baseName: string) {
    this.expandedGroups[baseName] = !this.expandedGroups[baseName];
  }

  getGroupVersions(templates: TemplateInfo[]): string {
    const versions = templates.map(t => t.name.replace(this.getBaseName(t.name) + '_', ''));
    return versions.join(', ');
  }

  getLatestTemplate(templates: TemplateInfo[]): TemplateInfo {
    // Sort by name to get the latest version (assuming _v1, _v2, etc. sorting)
    return templates.sort((a, b) => a.name.localeCompare(b.name)).pop()!;
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  applyFilters() {
    this.filteredTemplates = this.templates.filter(t => {
      const matchesName = !this.nameFilter || (t.name && t.name.toLowerCase().includes(this.nameFilter.toLowerCase()));
      const matchesDesc = !this.descFilter || (t.description && t.description.toLowerCase().includes(this.descFilter.toLowerCase()));
      const matchesAuthor = !this.authorFilter || (t.author && t.author.toLowerCase().includes(this.authorFilter.toLowerCase()));
      const matchesTeam = !this.teamFilter || (t.team_name && t.team_name.toLowerCase().includes(this.teamFilter.toLowerCase()));
      const matchesVersion = !this.versionFilter || (t.version_tag && t.version_tag.toLowerCase().includes(this.versionFilter.toLowerCase()));
      const matchesAudit = !this.auditFilter || (t.audit_pipeline && t.audit_pipeline.toLowerCase().includes(this.auditFilter.toLowerCase()));
      return matchesName && matchesDesc && matchesAuthor && matchesTeam && matchesVersion && matchesAudit;
    });
    this.groupTemplates();
  }

  clearAllFilters() {
    this.nameFilter = '';
    this.descFilter = '';
    this.authorFilter = '';
    this.teamFilter = '';
    this.versionFilter = '';
    this.auditFilter = '';
    this.applyFilters();
  }

  editTemplate(template: TemplateInfo) {
    this.navigate.emit({ view: 'form', mode: 'edit', templateName: template.name });
  }

  previewTemplate(template: TemplateInfo) {
    this.navigate.emit({ view: 'form', mode: 'preview', templateName: template.name });
  }

  viewHistory(template: TemplateInfo) {
    this.navigate.emit({ view: 'history', templateName: template.name });
  }

  deleteTemplate(template: TemplateInfo) {
    const dialogRef = this.dialog.open(DeleteConfirmationDialog, {
      width: '400px',
      data: { templateName: template.name }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.schemaService.deleteTemplate(template.name).subscribe({
          next: () => {
            // Remove from templates array
            this.templates = this.templates.filter(t => t.name !== template.name);
            this.applyFilters(); // This will update groupedTemplates
          },
          error: (err) => {
            console.error('Error deleting template:', err);
            // You could add a toast notification here
          }
        });
      }
    });
  }

  expandAll() {
    Object.keys(this.groupedTemplates).forEach(key => this.expandedGroups[key] = true);
  }

  collapseAll() {
    Object.keys(this.groupedTemplates).forEach(key => this.expandedGroups[key] = false);
  }
}

// Delete Confirmation Dialog Component
@Component({
  selector: 'delete-confirmation-dialog',
  template: `
    <h2 mat-dialog-title>Confirm Deletion</h2>
    <mat-dialog-content>
      <p>Are you sure you want to delete the template <strong>"{{ data.templateName }}"</strong>?</p>
      <p>This action cannot be undone.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="warn" [mat-dialog-close]="true">Delete</button>
    </mat-dialog-actions>
  `,
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule]
})
export class DeleteConfirmationDialog {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { templateName: string }) {}
} 