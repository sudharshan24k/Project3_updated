import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialogContent, MatDialogActions } from '@angular/material/dialog';

@Component({
  selector: 'app-interactive-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, NgIf, MatDialogContent, MatDialogActions],
  template: `
    <h2 mat-dialog-title>{{ data.title || 'Please Confirm' }}</h2>
    <mat-dialog-content>
      <p>{{ data.message }}</p>
      <ng-container *ngIf="data.question">
        <mat-form-field appearance="fill" style="width:100%;margin-top:1rem;">
          <mat-label>{{ data.question }}</mat-label>
          <input matInput [(ngModel)]="answer" />
        </mat-form-field>
      </ng-container>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onConfirm()">OK</button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content { font-size: 1.08rem; }
    mat-dialog-actions { margin-top: 1.2rem; }
  `]
})
export class InteractiveDialogComponent {
  answer: string = '';
  constructor(
    public dialogRef: MatDialogRef<InteractiveDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onConfirm() {
    this.dialogRef.close(this.answer || true);
  }
  onCancel() {
    this.dialogRef.close(false);
  }
}
