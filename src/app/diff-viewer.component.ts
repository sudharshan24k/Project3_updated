import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-diff-viewer',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="diff-viewer-container">
      <div class="diff-mode-toggle">
        <button (click)="diffMode = 'side-by-side'" [class.active]="diffMode === 'side-by-side'">Side-by-Side</button>
        <button (click)="diffMode = 'unified'" [class.active]="diffMode === 'unified'">Unified</button>
      </div>
      <div *ngIf="fieldDiffs.length === 0" class="card no-changes">
        <mat-icon>check_circle_outline</mat-icon>
        <h4>No Differences Found</h4>
        <p>The selected schemas are identical.</p>
      </div>
      <div *ngIf="fieldDiffs.length > 0">
        <div *ngIf="diffMode === 'side-by-side'" class="side-by-side-diff">
          <div class="side-by-side-header">
            <div>Old Schema</div>
            <div>New Schema</div>
          </div>
          <div *ngFor="let diff of fieldDiffs" class="side-by-side-row" [ngClass]="diff.type">
            <div class="side old">
              <ng-container *ngIf="diff.type !== 'added'">
                <div><strong>{{ diff.oldField.label }}</strong> <span class="field-key">({{ diff.oldField.key }})</span></div>
                <div *ngFor="let change of diff.changes">
                  <span class="change-label">{{ change.prop }}</span>:
                  <span class="old-value">{{ change.oldValue }}</span>
                </div>
                <div *ngIf="diff.type === 'removed'" class="removed-label">Field removed</div>
              </ng-container>
            </div>
            <div class="side new">
              <ng-container *ngIf="diff.type !== 'removed'">
                <div><strong>{{ diff.newField.label }}</strong> <span class="field-key">({{ diff.newField.key }})</span></div>
                <div *ngFor="let change of diff.changes">
                  <span class="change-label">{{ change.prop }}</span>:
                  <span class="new-value">{{ change.newValue }}</span>
                </div>
                <div *ngIf="diff.type === 'added'" class="added-label">Field added</div>
              </ng-container>
            </div>
          </div>
        </div>
        <div *ngIf="diffMode === 'unified'" class="unified-diff">
          <div *ngFor="let diff of fieldDiffs" class="unified-row" [ngClass]="diff.type">
            <div>
              <span class="field-key">{{ diff.oldField?.key || diff.newField?.key }}</span>
              <span *ngIf="diff.type === 'added'" class="added-label">+ {{ diff.newField.label }}</span>
              <span *ngIf="diff.type === 'removed'" class="removed-label">- {{ diff.oldField.label }}</span>
              <span *ngIf="diff.type === 'changed'">
                <strong>{{ diff.oldField.label }}</strong> → <strong>{{ diff.newField.label }}</strong>
                <span *ngFor="let change of diff.changes">
                  <span class="change-label">{{ change.prop }}</span>: <span class="old-value">{{ change.oldValue }}</span> → <span class="new-value">{{ change.newValue }}</span>
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .diff-viewer-container {
      font-family: 'Menlo', 'Monaco', monospace;
      font-size: 0.95rem;
      padding: 1rem 0;
    }
    .diff-mode-toggle {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .diff-mode-toggle button {
      background: none;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 0.3rem 1.2rem;
      cursor: pointer;
      font-weight: 600;
      color: var(--text-color);
      transition: background 0.2s;
    }
    .diff-mode-toggle button.active, .diff-mode-toggle button:hover {
      background: var(--primary-color-light);
      color: var(--primary-color);
    }
    .side-by-side-diff {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .side-by-side-header {
      display: grid;
      grid-template-columns: 1fr 1fr;
      font-weight: bold;
      margin-bottom: 0.5rem;
      color: var(--primary-color);
    }
    .side-by-side-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--border-color);
      margin-bottom: 0.25rem;
      background: var(--surface-color);
    }
    .side {
      padding: 0.75rem 1rem;
      min-height: 3.5rem;
      border-right: 1px solid var(--border-color);
    }
    .side.new { border-right: none; }
    .field-key {
      color: #888;
      font-size: 0.9em;
      margin-left: 0.5em;
    }
    .change-label {
      color: #b71c1c;
      font-weight: 600;
      margin-right: 0.3em;
    }
    .old-value { color: #b71c1c; text-decoration: line-through; }
    .new-value { color: #1b5e20; font-weight: 600; }
    .added-label { color: #1b5e20; font-weight: 700; }
    .removed-label { color: #b71c1c; font-weight: 700; }
    .unified-diff {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .unified-row {
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--border-color);
      margin-bottom: 0.25rem;
      background: var(--surface-color);
      padding: 0.75rem 1rem;
    }
    .no-changes {
      padding: 2rem;
      text-align: center;
      background-color: var(--background-color);
      color: var(--text-muted-color);
    }
    .no-changes mat-icon {
        font-size: 36px;
        width: 36px;
        height: 36px;
        margin-bottom: 0.5rem;
        color: var(--success-color);
    }
    .no-changes h4 { margin: 0 0 0.25rem 0; color: var(--text-color); }
    .no-changes p { margin: 0; }
  `]
})
export class DiffViewerComponent implements OnChanges {
  @Input() oldSchema: any[] = [];
  @Input() newSchema: any[] = [];
  diffMode: 'side-by-side' | 'unified' = 'side-by-side';
  fieldDiffs: any[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['oldSchema'] || changes['newSchema']) {
      this.fieldDiffs = this.compareSchemas(this.oldSchema, this.newSchema);
    }
  }

  compareSchemas(oldFields: any[], newFields: any[]): any[] {
    const diffs: any[] = [];
    const oldMap = new Map(oldFields.map(f => [f.key, f]));
    const newMap = new Map(newFields.map(f => [f.key, f]));
    // Find removed and changed fields
    for (const [key, oldField] of oldMap.entries()) {
      if (!newMap.has(key)) {
        diffs.push({ type: 'removed', oldField, newField: null, changes: [] });
      } else {
        const newField = newMap.get(key);
        const changes = this.compareFieldProps(oldField, newField);
        if (changes.length > 0) {
          diffs.push({ type: 'changed', oldField, newField, changes });
        }
      }
    }
    // Find added fields
    for (const [key, newField] of newMap.entries()) {
      if (!oldMap.has(key)) {
        diffs.push({ type: 'added', oldField: null, newField, changes: [] });
      }
    }
    return diffs;
  }

  compareFieldProps(f1: any, f2: any): any[] {
    const props = ['label', 'type', 'defaultValue', 'options', 'regex', 'mandatory', 'editable', 'placeholder'];
    const changes = [];
    for (const prop of props) {
      const v1 = JSON.stringify(f1[prop] ?? null);
      const v2 = JSON.stringify(f2[prop] ?? null);
      if (v1 !== v2) {
        changes.push({ prop, oldValue: f1[prop], newValue: f2[prop] });
      }
    }
    return changes;
  }
} 