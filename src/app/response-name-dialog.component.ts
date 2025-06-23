import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';

export interface ResponseNameDialogData {
  responseName: string;
}

@Component({
  selector: 'app-response-name-dialog',
  template: `
    <h2 mat-dialog-title>Name Your Response</h2>
    <mat-dialog-content>
      <mat-form-field appearance="fill" class="full-width">
        <mat-label>Response Name</mat-label>
        <input matInput [(ngModel)]="data.responseName" placeholder="E.g. Initial Review, QA Feedback...">
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]!="data.responseName">Save</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; }
    mat-form-field { width: 100%; }
  `],
  standalone: true,
  imports: [MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, FormsModule]
})
export class ResponseNameDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ResponseNameDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ResponseNameDialogData
  ) {}

  onSave() {
    this.dialogRef.close(this.data.responseName);
  }

  onCancel() {
    this.dialogRef.close(null);
  }
}
