import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';

export interface VersionDialogData {
  description: string;
  action: 'update' | 'newVersion' | null;
}

@Component({
  selector: 'app-version-dialog',
  template: `
    <h2 mat-dialog-title>Schema Versioning</h2>
    <mat-dialog-content>
      <mat-form-field appearance="fill" class="full-width">
        <mat-label>Describe your changes</mat-label>
        <textarea matInput [(ngModel)]="data.description" rows="3" placeholder="E.g. Added new field, fixed typo..."></textarea>
      </mat-form-field>
      <div class="action-group">
        <button mat-raised-button color="primary" (click)="choose('update')" [disabled]="!data.description || data.description.trim() === ''">Update This Schema</button>
        <button mat-stroked-button color="accent" (click)="choose('newVersion')" [disabled]="!data.description || data.description.trim() === ''">Create New Version</button>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host {
      --primary: var(--primary-color, #6aaadf);
      --accent: var(--accent-color, #5B9DD9);
      --surface: var(--surface-color, #fff);
      --text: var(--text-color, #1E2F3C);
      --shadow: var(--shadow-color-light, rgba(0,0,0,0.05));
      --border: var(--border-color, #C2D6E5);
    }
    .full-width { width: 100%; }
    .action-group {
      display: flex;
      gap: 1rem;
      margin: 1.5rem 0 0.5rem 0;
    }
    textarea {
      min-width: 300px;
    }
    .action-group button {
      min-width: 160px;
      border-radius: 0.6rem;
      font-weight: 600;
      letter-spacing: 0.01em;
      box-shadow: 0 2px 8px var(--shadow);
      transition: 
        background 0.18s, 
        color 0.18s, 
        box-shadow 0.18s, 
        border-color 0.18s;
      outline: none;
    }
    .action-group button[color="primary"] {
      background: var(--primary);
      color: #fff !important;
      border: 1.5px solid var(--primary);
    }
    .action-group button[color="primary"]:hover,
    .action-group button[color="primary"]:focus {
      background: var(--accent);
      border-color: var(--accent);
      box-shadow: 0 4px 16px var(--shadow-color-dark, rgba(0,0,0,0.15));
    }
    .action-group button[color="accent"] {
      background: var(--surface);
      color: var(--accent) !important;
      border: 1.5px solid var(--accent);
    }
    .action-group button[color="accent"]:hover,
    .action-group button[color="accent"]:focus {
      background: var(--accent);
      color: #fff !important;
      box-shadow: 0 4px 16px var(--shadow-color-dark, rgba(0,0,0,0.15));
    }
    .action-group button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      box-shadow: none;
      background: var(--border);
      color: var(--text-muted-color, #6A88A0) !important;
      border-color: var(--border);
    }
    mat-dialog-actions button[mat-button] {
      color: var(--text-muted-color, #6A88A0);
      font-weight: 500;
      border-radius: 0.5rem;
      transition: background 0.18s;
    }
    mat-dialog-actions button[mat-button]:hover,
    mat-dialog-actions button[mat-button]:focus {
      background: var(--secondary-color, #C7E3F8);
      color: var(--primary);
    }
  `],
  standalone: true,
  imports: [MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, FormsModule]
})
export class VersionDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<VersionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: VersionDialogData
  ) {}

  choose(action: 'update' | 'newVersion') {
    this.data.action = action;
    this.dialogRef.close(this.data);
  }

  onCancel() {
    this.dialogRef.close(null);
  }
}
