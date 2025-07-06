import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

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
  imports: [CommonModule],
  templateUrl: './config-validator-box.component.html',
  styleUrls: ['./config-validator-box.component.scss']
})
export class ConfigValidatorBoxComponent implements OnInit {
  @Input() formName = '';
  @Input() overallStatus: 'success' | 'fail' = 'success';
  @Input() fieldResults: ConfigValidationFieldResult[] = [];
  @Input() data: any;
  @Input() extraFields: string[] = [];
  @Input() missingFields: string[] = [];
  @Input() syntaxErrors: string[] = [];
  @Input() validationErrors: string[] = [];
  @Input() warnings: string[] = [];
  @Output() close = new EventEmitter();

  ngOnInit() {
    if (this.data) {
      this.formName = this.data.formName;
      
      // Only errors should cause validation failure, NOT warnings
      const hasErrors = (this.data.validationErrors && this.data.validationErrors.length > 0) || 
                        (this.data.syntaxErrors && this.data.syntaxErrors.length > 0);
      
      // Set status based on errors only (warnings should not cause failure)
      this.overallStatus = hasErrors ? 'fail' : 'success';
      
      this.fieldResults = this.data.fieldResults;
      this.extraFields = this.data.extraFields || [];
      this.missingFields = this.data.missingFields || [];
      this.syntaxErrors = this.data.syntaxErrors || [];
      this.validationErrors = this.data.validationErrors || [];
      this.warnings = this.data.warnings || [];
    }
  }

  get statusText() {
    return this.overallStatus === 'fail' ? 'Config file validation failed' : 'Config file validated successfully';
  }

  get statusClass() {
    return this.overallStatus === 'fail' ? 'status-fail' : 'status-success';
  }

  onClose() {
    this.close.emit();
  }
}
