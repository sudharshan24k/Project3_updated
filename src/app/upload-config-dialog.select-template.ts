import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-select-template-version',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatAutocompleteModule, MatOptionModule, MatButtonModule, MatIconModule
  ],
  template: `
    <div style="margin-top: 1.5rem;">
      <mat-form-field appearance="outline" style="width: 100%;">
        <mat-label>Template Name</mat-label>
        <input matInput [(ngModel)]="selectedTemplateName" (input)="onTemplateInput()" [matAutocomplete]="auto" placeholder="Type or select template name">
        <mat-autocomplete #auto="matAutocomplete" (optionSelected)="onTemplateSelected($event.option.value)">
          <mat-option *ngFor="let t of filteredTemplates" [value]="t.name">{{ t.name }}</mat-option>
        </mat-autocomplete>
      </mat-form-field>
      <mat-form-field appearance="outline" style="width: 100%; margin-top: 1rem;">
        <mat-label>Version Tag (optional)</mat-label>
        <input matInput [(ngModel)]="selectedVersionTag" placeholder="e.g. v2, latest">
      </mat-form-field>
      <div *ngIf="errorMessage" style="color: #d32f2f; margin-top: 0.5rem;">{{ errorMessage }}</div>
      <button mat-stroked-button color="primary" style="margin-top: 1rem;" (click)="confirmSelection()" [disabled]="!selectedTemplateName">Continue</button>
    </div>
  `
})
export class SelectTemplateVersionComponent {
  @Input() templates: any[] = [];
  @Output() templateSelected = new EventEmitter<{ name: string, versionTag?: string }>();
  selectedTemplateName = '';
  selectedVersionTag = '';
  filteredTemplates: any[] = [];
  errorMessage = '';

  ngOnInit() {
    this.filteredTemplates = this.templates;
  }

  onTemplateInput() {
    const val = this.selectedTemplateName.toLowerCase();
    this.filteredTemplates = this.templates.filter(t => t.name.toLowerCase().includes(val));
  }

  onTemplateSelected(name: string) {
    this.selectedTemplateName = name;
    this.errorMessage = '';
  }

  confirmSelection() {
    if (!this.selectedTemplateName) {
      this.errorMessage = 'Please select a template.';
      return;
    }
    this.templateSelected.emit({ name: this.selectedTemplateName, versionTag: this.selectedVersionTag });
  }
}
