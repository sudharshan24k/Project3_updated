import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-diff-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="diff" class="diff-viewer-container">
      <div *ngIf="changes.length === 0" class="no-changes">
        <p>No differences found between the selected versions.</p>
      </div>
      <div *ngIf="changes.length > 0" class="changes-list">
        <div *ngFor="let change of changes" class="change-item" [ngClass]="change.type">
          <div class="change-header">
             <span class="change-type-badge">{{ change.type.replace('_', ' ') | titlecase }}</span>
            <strong>{{ change.path }}</strong> 
          </div>
          <div class="change-body">
            <div *ngIf="change.type === 'value_changed'" class="value-comparison">
              <span class="old-value">{{ change.oldValue }}</span>
              <span class="arrow">→</span>
              <span class="new-value">{{ change.newValue }}</span>
            </div>
            <div *ngIf="change.type === 'item_added'">
              <span class="new-value">{{ change.newValue }}</span>
            </div>
            <div *ngIf="change.type === 'item_removed'">
              <span class="old-value">{{ change.oldValue }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .diff-viewer-container {
      font-family: 'Roboto Mono', monospace;
      font-size: 0.9rem;
    }
    .no-changes {
      padding: 1rem;
      background-color: #f8f9fa;
      text-align: center;
      border-radius: 4px;
    }
    .changes-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .change-item {
      border: 1px solid #dee2e6;
      border-radius: 4px;
      overflow: hidden;
    }
    .change-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background-color: #f8f9fa;
      border-bottom: 1px solid #dee2e6;
    }
    .change-type-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
      color: #fff;
    }
    .change-body {
      padding: 0.75rem;
    }
    .value-comparison {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .arrow {
      color: #6c757d;
    }
    .old-value, .new-value {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
    }

    /* Color Coding */
    .value_changed .change-header { border-left: 4px solid #ffc107; }
    .value_changed .change-type-badge { background-color: #ffc107; }
    
    .item_added .change-header { border-left: 4px solid #28a745; }
    .item_added .change-type-badge { background-color: #28a745; }
    .new-value { background-color: #e6ffed; }

    .item_removed .change-header { border-left: 4px solid #dc3545; }
    .item_removed .change-type-badge { background-color: #dc3545; }
    .old-value { background-color: #ffebee; text-decoration: line-through; }
  `]
})
export class DiffViewerComponent implements OnChanges {
  @Input() diff: any;
  changes: any[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['diff'] && this.diff) {
      this.parseDiff();
    }
  }

  parseDiff() {
    const parsedChanges = [];
    if (this.diff.values_changed) {
      for (const key in this.diff.values_changed) {
        const path = key.replace("root['", "").replace("']", "");
        parsedChanges.push({
          type: 'value_changed',
          path: path,
          oldValue: this.diff.values_changed[key].old_value,
          newValue: this.diff.values_changed[key].new_value
        });
      }
    }
    // Add similar parsing for items_added and items_removed if needed by deepdiff output
    this.changes = parsedChanges;
  }
} 