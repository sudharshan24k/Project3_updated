import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { getConfigValidationFieldResults, debugFieldVisibility } from './dynamic-form/conf-parser';
import { FormsModule } from '@angular/forms';

export interface ConfigValidationFieldResult {
  key: string;
  label: string;
  status: 'valid' | 'missing' | 'invalid' | 'extra' | 'hidden' | 'warning';
  message?: string;
  error?: boolean;
}

@Component({
  selector: 'app-config-validator-box',
  standalone: true,
  imports: [FormsModule, CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './config-validator-box.component.html',
  styleUrls: ['./config-validator-box.component.scss']
})
export class ConfigValidatorBoxComponent implements OnInit, OnChanges {
  @Input() formName = '';
  @Input() overallStatus: 'success' | 'fail' = 'success';
  @Input() data: any = {};
  @Input() syntaxErrors: string[] = [];
  @Input() validationErrors: string[] = [];
  @Input() warnings: string[] = [];
  @Input() parsedData: any = {};
  @Input() schema: any = {};
  @Input() extraFields: string[] = [];
  @Input() templateVersion: string = '';
  @Output() close = new EventEmitter();

  validationResults: any[] = [];
  debugInfo: any[] = [];
  activeTab: 'all' | 'visible' | 'hidden' | 'errors' = 'all';
  summary = {
    total: 0,
    valid: 0,
    invalid: 0,
    missing: 0,
    hidden: 0
  };

  showSyntaxErrors = true;
  showSummary = true;
  showResults = true;
  showValidationErrors = true;

  ngOnInit() {
    if (this.data) {
      this.formName = this.data.formName || '';
      this.overallStatus = this.data.overallStatus || 'success';
      this.syntaxErrors = this.data.syntaxErrors || [];
      this.validationErrors = this.data.validationErrors || [];
      this.warnings = this.data.warnings || [];
      // Try to auto-detect template version from data or schema
      if (!this.templateVersion) {
        if (this.data?.version) {
          this.templateVersion = this.data.version;
        } else if (this.schema?.version) {
          this.templateVersion = this.schema.version;
        } else if (this.schema?.fields && this.schema?.fields.length > 0 && this.schema?.fields[0]?.version) {
          this.templateVersion = this.schema.fields[0].version;
        } else {
          this.templateVersion = '1.0';
        }
      }
    }
    this.showSyntaxErrors = this.syntaxErrors && this.syntaxErrors.length > 0;
    this.showSummary = !this.showSyntaxErrors;
    this.showResults = true;
    this.showValidationErrors = this.validationErrors && this.validationErrors.length > 0;
    this.updateValidation();
    
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['parsedData'] || changes['schema'] || changes['extraFields'] || changes['syntaxErrors']) {
      if (this.syntaxErrors && this.syntaxErrors.length > 0) {
        this.overallStatus = 'fail';
        this.showSyntaxErrors = true;
        this.showSummary = false;
      } else {
        this.showSyntaxErrors = false;
        this.showSummary = true;
      }
      this.showResults = true;
      this.showValidationErrors = this.validationErrors && this.validationErrors.length > 0;
      this.updateValidation();
    }
  }

  updateValidation() {
  this.validationResults = getConfigValidationFieldResults(
    this.parsedData,
    this.schema,
    this.extraFields
  );
  this.calculateSummary();
  
  // Update overall status based on validation results
  this.updateOverallStatus();
}
updateOverallStatus() {
  const hasErrors = (this.syntaxErrors && this.syntaxErrors.length > 0) ||
                   (this.validationErrors && this.validationErrors.length > 0) ||
                   this.getInvalidCount() > 0;
  
  this.overallStatus = hasErrors ? 'fail' : 'success';
}

  calculateSummary() {
    this.summary = {
      total: this.validationResults.length,
      valid: this.validationResults.filter(r => r.status === 'valid').length,
      invalid: this.validationResults.filter(r => r.status === 'invalid').length,
      missing: this.validationResults.filter(r => r.status === 'missing').length,
      hidden: this.validationResults.filter(r => r.status === 'hidden').length
    };
  }

  get statusText() {
    return this.overallStatus === 'fail' ? 'Config file validation failed' : 'Config file validated successfully';
  }

  get statusClass() {
    return this.overallStatus === 'fail' ? 'status-fail' : 'status-success';
  }

  hasIssues(): boolean {
    return (this.syntaxErrors && this.syntaxErrors.length > 0) ||
           (this.validationErrors && this.validationErrors.length > 0) ||
           (this.extraFields && this.extraFields.length > 0) ||
           (this.warnings && this.warnings.length > 0);
  }

  getValidCount(): number {
    return this.validationResults.filter(field => field.status === 'valid').length;
  }

  getInvalidCount(): number {
    return this.validationResults.filter(field => 
      field.status === 'invalid' || 
      field.status === 'missing' || 
      field.status === 'extra'
    ).length;
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'valid': return '✓';
      case 'invalid': return '✗';
      case 'missing': return '⚠';
      case 'hidden': return '👁';
      default: return '?';
    }
  }

getStatusClass(status: string): string {
  switch (status) {
    case 'valid':
      return 'valid';
    case 'invalid':
      return 'invalid';
    case 'missing':
      return 'missing';
    case 'warning':
      return 'warning';
    case 'hidden':
      return 'hidden';
    case 'extra':
      return 'extra';
    default:
      return '';
  }
}

  getHiddenFields() {
    return this.validationResults.filter(r => r.status === 'hidden');
  }

  getVisibleFields() {
    return this.validationResults.filter(r => r.status !== 'hidden');
  }

  getErrorFields() {
    return this.validationResults.filter(r => r.error);
  }

  getFilteredResults() {
    switch (this.activeTab) {
      case 'visible':
        return this.getVisibleFields();
      case 'hidden':
        return this.getHiddenFields();
      case 'errors':
        return this.getErrorFields();
      default:
        return this.validationResults;
    }
  }

  onOverlayClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  onClose() {
    this.close.emit();
  }
}
