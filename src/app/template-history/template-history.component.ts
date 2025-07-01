import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SchemaService, TemplateVersion } from '../dynamic-form/schema.service';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { DiffViewerComponent } from '../diff-viewer.component';
import { MatDialog } from '@angular/material/dialog';
import { AnimatedPopupComponent } from '../animated-popup.component';
import { InteractiveDialogComponent } from '../interactive-dialog.component';

@Component({
  selector: 'app-template-history',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule, MatButtonModule, DiffViewerComponent, AnimatedPopupComponent],
  template: `
    <div class="container">
      <header class="page-header">
        <button (click)="goBack()" class="back-button">
          <mat-icon>arrow_back</mat-icon>
          <span>Back</span>
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
              <th></th>
              <!-- <th>Version</th> -->
              <th>Author</th>
              <th>Change Log</th>
              <th>Timestamp</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let update of history">
              <td>
                <input type="checkbox"
                  [checked]="selectedUpdates.has(update.created_at)"
                  (change)="toggleUpdate(update)"
                  [disabled]="selectedUpdates.size >= 2 && !selectedUpdates.has(update.created_at)">
              </td>
              <!-- <td>{{ update.version }}</td> -->
              <td>{{ update.author || 'N/A' }}</td>
              <td>{{ update.change_log }}</td>
              <td>{{ update.created_at | date:'medium' }}</td>
              <td>
                <button mat-stroked-button color="warn" (click)="onRollback(update)" [disabled]="isRollingBack">
                  <mat-icon>restore</mat-icon> Rollback
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="compare-bar" *ngIf="history.length > 1">
          <button mat-raised-button color="primary" [disabled]="selectedUpdates.size !== 2" (click)="compareUpdates()">
            <mat-icon>compare_arrows</mat-icon>
            Compare Selected Updates
          </button>
        </div>
      </div>

      <div *ngIf="diffResult" class="github-diff-card">
        <div class="github-diff-header">
          <mat-icon class="diff-icon">difference</mat-icon>
          <span class="diff-title">Schema Comparison Result</span>
          <span class="diff-meta">Comparing updates</span>
        </div>
        <div class="github-diff-body">
          <app-diff-viewer [oldSchema]="oldSchema" [newSchema]="newSchema"></app-diff-viewer>
        </div>
      </div>

      <app-animated-popup *ngIf="popupVisible" [type]="popupType" [message]="popupMessage"></app-animated-popup>
    </div>
  `,
  styles: [
    `
    /* Basic styles, similar to dashboard */
    .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    .page-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; }
    .back-button { 
      background: none; 
      border: none; 
      cursor: pointer; 
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--primary-color);
      font-size: 1rem;
      font-weight: 700;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      transition: background-color 0.2s;
    }
    .back-button:hover {
      background-color: rgba(0, 0, 0, 0.05);
    }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 1rem; border-bottom: 1px solid var(--border-color); text-align: left; }

    /* GitHub-style diff card */
    .github-diff-card {
      background: #f6f8fa;
      border: 1px solid #d0d7de;
      border-radius: 8px;
      margin: 2.5rem 0 1.5rem 0;
      box-shadow: 0 2px 8px #0001;
      overflow: hidden;
    }
    .github-diff-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: #f3f4f6;
      border-bottom: 1px solid #d0d7de;
      padding: 1.1rem 1.5rem 1.1rem 1.2rem;
      font-size: 1.18rem;
      font-weight: 600;
      color: #24292f;
    }
    .github-diff-header .diff-icon {
      color: #8250df;
      font-size: 2rem;
    }
    .github-diff-header .diff-title {
      font-weight: 700;
      font-size: 1.18rem;
      margin-right: 1.2rem;
    }
    .github-diff-header .diff-meta {
      font-size: 0.98rem;
      color: #57606a;
      margin-left: auto;
      font-weight: 400;
    }
    .github-diff-body {
      padding: 2rem 2.5rem 2.5rem 2.5rem;
      background: #fff;
    }
    `
  ]
})
export class TemplateHistoryComponent implements OnInit {
  templateName: string | null = null;
  history: TemplateVersion[] = [];
  isLoading = false;
  selectedUpdates = new Set<string>();
  diffResult: any = null;
  oldSchema: any[] = [];
  newSchema: any[] = [];
  isRollingBack = false;

  constructor(
    private schemaService: SchemaService,
    private location: Location,
    private route: ActivatedRoute,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    // Get template name from route parameter
    this.route.params.subscribe(params => {
      this.templateName = params['templateName'];
      if (this.templateName) {
        this.loadHistory();
      }
    });
  }

  loadHistory() {
    if (!this.templateName) return;
    this.isLoading = true;
    this.schemaService.getTemplateHistory(this.templateName).subscribe({
      next: (history) => {
        this.history = history.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading template history:', err);
        this.history = []; // Ensure history is empty on error
        this.isLoading = false;
      }
    });
  }

  toggleUpdate(update: any) {
    const updateId = update.created_at;
    if (this.selectedUpdates.has(updateId)) {
      this.selectedUpdates.delete(updateId);
    } else {
      if (this.selectedUpdates.size < 2) {
        this.selectedUpdates.add(updateId);
      }
    }
  }

  compareUpdates() {
    if (this.selectedUpdates.size !== 2) return;
    const ids = Array.from(this.selectedUpdates);
    const [id1, id2] = ids;
    const upd1 = this.history.find(h => h.created_at === id1);
    const upd2 = this.history.find(h => h.created_at === id2);
    this.oldSchema = upd1?.schema?.fields || [];
    this.newSchema = upd2?.schema?.fields || [];
    this.diffResult = { update1: id1, update2: id2 };
  }

  goBack() {
    this.location.back();
  }

  async onRollback(update: TemplateVersion) {
    if (!this.templateName || !update.version) return;
    const dialogRef = this.dialog.open(InteractiveDialogComponent, {
      width: '350px',
      data: {
        title: 'Rollback Template',
        message: `Are you sure you want to rollback to version ${update.version}? This will overwrite the current template.`,
        type: 'confirm'
      }
    });
    const result = await dialogRef.afterClosed().toPromise();
    if (!result) return;
    this.isRollingBack = true;
    this.schemaService.rollbackTemplate(this.templateName, update.version).subscribe({
      next: () => {
        this.isRollingBack = false;
        this.loadHistory();
        this.showPopup('Rollback successful!', 'success');
      },
      error: (err) => {
        this.isRollingBack = false;
        this.showPopup('Rollback failed. See console for details.', 'error');
      }
    });
  }
  popupMessage: string = '';
  popupType: 'success' | 'error' | 'airplane' = 'success';
  popupVisible = false;
  showPopup(message: string, type: 'success' | 'error' | 'airplane' = 'success') {
    this.popupMessage = message;
    this.popupType = type;
    this.popupVisible = true;
    setTimeout(() => {
      this.popupVisible = false;
    }, 1800);
  }
}