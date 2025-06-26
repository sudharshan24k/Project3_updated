import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule, NgClass, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-custom-dialog',
  standalone: true,
  imports: [CommonModule, MatIconModule, NgClass, NgIf, FormsModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="custom-dialog-content animate-pop">
      <div class="icon" *ngIf="data.icon">
        <mat-icon [ngClass]="data.iconClass" style="font-size: 64px;">{{ data.icon }}</mat-icon>
      </div>
      <h2 class="title">{{ data.title }}</h2>
      <div class="message">{{ data.message }}</div>
      <div *ngIf="data.type === 'prompt'" class="prompt-input">
        <mat-form-field appearance="fill" class="full-width">
          <mat-label>{{ data.inputLabel || 'Enter value' }}</mat-label>
          <input matInput [(ngModel)]="inputValue" [placeholder]="data.inputPlaceholder || ''">
        </mat-form-field>
      </div>
      <div class="actions">
        <button *ngIf="data.type === 'confirm'" mat-raised-button color="primary" (click)="close(true)">Yes</button>
        <button *ngIf="data.type === 'confirm'" mat-raised-button color="warn" (click)="close(false)">No</button>
        <button *ngIf="data.type === 'prompt'" mat-button (click)="close(null)">Cancel</button>
        <button *ngIf="data.type === 'prompt'" mat-raised-button color="primary" (click)="close(inputValue)" [disabled]="!inputValue">Save</button>
        <button *ngIf="data.type !== 'confirm' && data.type !== 'prompt'" mat-raised-button color="primary" (click)="close()">OK</button>
      </div>
    </div>
  `,
  styles: [`
    .custom-dialog-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-width: 350px;
      min-height: 220px;
      padding: 2.5rem 2rem 2rem 2rem;
      background: #fff;
      border-radius: 24px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.18);
      animation: popIn 0.4s cubic-bezier(.68,-0.55,.27,1.55);
    }
    .icon {
      margin-bottom: 1rem;
      color: #1976d2;
      animation: bounce 1s;
    }
    .title {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      text-align: center;
    }
    .message {
      font-size: 1.2rem;
      margin-bottom: 1.5rem;
      text-align: center;
    }
    .prompt-input {
      width: 100%;
      margin-bottom: 1.5rem;
    }
    .full-width { width: 100%; }
    .actions {
      display: flex;
      gap: 1.5rem;
      justify-content: center;
    }
    @keyframes popIn {
      0% { transform: scale(0.7); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-18px); }
    }
  `]
})
export class CustomDialogComponent {
  inputValue: string = '';
  constructor(
    public dialogRef: MatDialogRef<CustomDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    if (data && data.defaultValue) {
      this.inputValue = data.defaultValue;
    }
  }

  close(result?: any) {
    this.dialogRef.close(result);
  }
}
