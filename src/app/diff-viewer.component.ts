import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-diff-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="diff" class="diff-viewer-container">
      <div *ngIf="changes.length === 0" class="card no-changes">
        <mat-icon>check_circle_outline</mat-icon>
        <h4>No Differences Found</h4>
        <p>The selected submissions are identical.</p>
      </div>
      <div *ngIf="changes.length > 0" class="changes-list">
        <div *ngFor="let change of changes" class="change-item" [ngClass]="change.type">
          <div class="change-header">
             <span class="change-type-badge">{{ getChangeTypeText(change.type) }}</span>
            <strong>{{ change.path }}</strong> 
          </div>
          <div class="change-body">
            <div *ngIf="change.type === 'value_changed'" class="value-comparison">
              <div class="value-wrapper old-value">
                <span class="value">{{ change.oldValue }}</span>
              </div>
              <div class="arrow">→</div>
              <div class="value-wrapper new-value">
                <span class="value">{{ change.newValue }}</span>
              </div>
            </div>
            <div *ngIf="change.type === 'item_added'">
              <div class="value-wrapper new-value">
                <span class="value">{{ change.newValue }}</span>
              </div>
            </div>
            <div *ngIf="change.type === 'item_removed'">
              <div class="value-wrapper old-value">
                <span class="value">{{ change.oldValue }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .diff-viewer-container {
      font-family: 'Menlo', 'Monaco', monospace;
      font-size: 0.9rem;
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
    
    .changes-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .change-item {
      border: 1px solid var(--border-color);
      border-radius: 8px;
      overflow: hidden;
      background-color: var(--surface-color);
    }
    .change-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      background-color: var(--background-color);
      border-bottom: 1px solid var(--border-color);
    }
    .change-type-badge {
      padding: 0.25rem 0.65rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--surface-color);
      text-transform: uppercase;
    }
    .change-body {
      padding: 1rem;
    }
    .value-comparison {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 1rem;
    }
    .arrow {
      color: var(--text-muted-color);
      font-size: 1.5rem;
    }
    .value-wrapper {
        padding: 0.75rem;
        border-radius: 6px;
    }
    .value {
        white-space: pre-wrap;
        word-break: break-all;
    }

    /* Color Coding */
    :host {
        --diff-changed-bg: #fff8e1;
        --diff-changed-text: #6d4c41;
        --diff-changed-border: #ffc107;
        
        --diff-added-bg: #e8f5e9;
        --diff-added-text: #1b5e20;
        --diff-added-border: #4caf50;

        --diff-removed-bg: #ffebee;
        --diff-removed-text: #b71c1c;
        --diff-removed-border: #f44336;
    }

    .value_changed { border-left: 4px solid var(--diff-changed-border); }
    .value_changed .change-type-badge { background-color: var(--diff-changed-border); }
    
    .item_added { border-left: 4px solid var(--diff-added-border); }
    .item_added .change-type-badge { background-color: var(--diff-added-border); }
    .new-value { background-color: var(--diff-added-bg); color: var(--diff-added-text); }

    .item_removed { border-left: 4px solid var(--diff-removed-border); }
    .item_removed .change-type-badge { background-color: var(--diff-removed-border); }
    .old-value { background-color: var(--diff-removed-bg); color: var(--diff-removed-text); text-decoration: line-through; }
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

  getChangeTypeText(type: string): string {
      return type.replace(/_/g, ' ').replace('dictionary item', '');
  }

  parseDiff() {
    const parsedChanges: any[] = [];
    const processPath = (p: string) => p.replace(/^root\['|'\]$/g, '').replace(/']\['/g, '.');

    if (this.diff.values_changed) {
      for (const key in this.diff.values_changed) {
        parsedChanges.push({
          type: 'value_changed',
          path: processPath(key),
          oldValue: this.diff.values_changed[key].old_value,
          newValue: this.diff.values_changed[key].new_value
        });
      }
    }
    if (this.diff.dictionary_item_added) {
        for(const item of this.diff.dictionary_item_added) {
            parsedChanges.push({ type: 'item_added', path: processPath(item), newValue: 'Value added' });
        }
    }
     if (this.diff.dictionary_item_removed) {
        for(const item of this.diff.dictionary_item_removed) {
            parsedChanges.push({ type: 'item_removed', path: processPath(item), oldValue: 'Value removed' });
        }
    }
    this.changes = parsedChanges;
  }
} 