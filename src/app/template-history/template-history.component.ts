import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SchemaService, TemplateVersion } from '../dynamic-form/schema.service';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-template-history',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule, MatButtonModule],
  template: `
    <div class="container">
      <header class="page-header">
        <button (click)="goBack()" class="back-button">
          <mat-icon>arrow_back</mat-icon>
          <span>Back to Dashboard</span>
        </button>
        <h1>Version History for "{{ templateName }}"</h1>
      </header>

      <div *ngIf="isLoading" class="loading-spinner">Loading history...</div>

      <div *ngIf="!isLoading && history.length === 0" class="card empty-state">
        <h4>No History Found</h4>
        <p>This template does not have any saved versions.</p>
      </div>

      <div *ngIf="!isLoading && history.length > 0" class="history-table">
        <table>
          <thead>
            <tr>
              <th>Version</th>
              <th>Change Log</th>
              <th>Timestamp</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let version of history">
              <td>{{ version.version }}</td>
              <td>{{ version.change_log }}</td>
              <td>{{ version.created_at | date:'medium' }}</td>
              <td>
                <button mat-icon-button (click)="rollback(version.version)" matTooltip="Rollback to this version">
                  <mat-icon>history</mat-icon>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [
    `
    /* Basic styles, similar to dashboard */
    .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    .page-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; }
    .back-button { background: none; border: none; cursor: pointer; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 1rem; border-bottom: 1px solid var(--border-color); text-align: left; }
    `
  ]
})
export class TemplateHistoryComponent implements OnInit {
  templateName: string | null = null;
  history: TemplateVersion[] = [];
  isLoading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private schemaService: SchemaService
  ) { }

  ngOnInit(): void {
    this.templateName = this.route.snapshot.paramMap.get('name');
    if (this.templateName) {
      this.loadHistory();
    }
  }

  loadHistory() {
    if (!this.templateName) return;
    this.isLoading = true;
    this.schemaService.getTemplateHistory(this.templateName).subscribe(history => {
      this.history = history;
      this.isLoading = false;
    });
  }

  rollback(version: number) {
    if (!this.templateName) return;
    if (confirm(`Are you sure you want to roll back to version ${version}? This will create a new version.`)) {
      this.schemaService.rollbackTemplate(this.templateName, version).subscribe(() => {
        alert('Rollback successful. A new version has been created.');
        this.loadHistory();
      });
    }
  }

  goBack() {
    this.router.navigate(['/']);
  }
} 