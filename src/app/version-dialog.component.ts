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
    .full-width { width: 100%; }
    .action-group { display: flex; gap: 1rem; margin: 1.5rem 0 0.5rem 0; }
    textarea { min-width: 300px; }
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
