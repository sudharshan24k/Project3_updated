import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-filler-name-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatCardModule],
  templateUrl: './filler-name-dialog.component.html'
})
export class FillerNameDialogComponent {
  fillerName = '';

  constructor(public dialogRef: MatDialogRef<FillerNameDialogComponent>) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    this.dialogRef.close(this.fillerName);
  }
} 