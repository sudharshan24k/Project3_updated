import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SchemaService, Submission, Response } from './dynamic-form/schema.service';
import { FormsModule } from '@angular/forms';
import { DiffViewerComponent } from './diff-viewer.component';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ResponseNameDialogComponent } from './response-name-dialog.component';
import { EmailDialogComponent } from './email-dialog.component';
import { AnimatedPopupComponent } from './animated-popup.component';
import { InteractiveDialogComponent } from './interactive-dialog.component';
import JSZip from 'jszip';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-submissions-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule, DiffViewerComponent, MatIconModule, MatTooltipModule, MatButtonModule, AnimatedPopupComponent],
  templateUrl: './submissions-viewer.component.html',
  styleUrls: ['./submissions-viewer.component.scss'],
})
export class SubmissionsViewerComponent implements OnInit, OnChanges, OnDestroy {
  @Input() templateName: string | null = null;
  @Output() viewTemplate = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  isLoading = false;
  submissions: Submission[] = [];
  selectedSubmissionName: string | null = null;
  selectedSubmission: Submission | null = null;
  selectedSubmissionData: any = null;
  formattedSubmissionData: string | null = null;
  selectedVersions = new Set<string>(); // Now stores submission_names
  diffResult: any = null;
  oldSchema: any[] = [];
  newSchema: any[] = [];
  @Output() duplicateEdit = new EventEmitter<{ template: string, prefillSubmissionData: any }>();
  newResponseContent: string = '';

  popupMessage: string = '';
  popupType: 'success' | 'error' | 'airplane' = 'success';
  popupVisible = false;

  environments = ['PROD', 'DEV', 'COB'];
  selectedEnv = 'PROD';
  envFormattedSubmissionData: { [env: string]: string } = {};

  private destroy$ = new Subject<void>();

  constructor(private schemaService: SchemaService, private router: Router, private dialog: MatDialog) {}

  ngOnInit() {
    this.loadSubmissions();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['templateName']) {
      this.resetState();
      this.loadSubmissions();
    }
  }

  resetState() {
    this.submissions = [];
    this.selectedSubmissionName = null;
    this.selectedSubmission = null;
    this.selectedSubmissionData = null;
    this.formattedSubmissionData = null;
    this.selectedVersions.clear();
    this.diffResult = null;
    this.oldSchema = [];
    this.newSchema = [];
  }

  loadSubmissions() {
    if (!this.templateName) return;
    this.isLoading = true;
    this.schemaService.listSubmissions(this.templateName)
      .pipe(takeUntil(this.destroy$))
      .subscribe((subs: Submission[]) => {
        // Sort by submission_name (tev2_1, tev2_2, ...)
        this.submissions = subs.sort((a: Submission, b: Submission) => {
          if (!a.submission_name || !b.submission_name) return 0;
          const aNum = parseInt(a.submission_name.split('_').pop() || '0', 10);
          const bNum = parseInt(b.submission_name.split('_').pop() || '0', 10);
          return bNum - aNum;
        });
        this.isLoading = false;
      });
  }

  viewSubmission(submissionName: string) {
    if (!this.templateName) return;
    this.selectedSubmissionName = submissionName;
    this.diffResult = null;
    this.selectedEnv = 'PROD'; // Default to PROD tab
    this.schemaService.getSubmissionByName(this.templateName, submissionName)
      .pipe(takeUntil(this.destroy$))
      .subscribe(sub => {
        this.selectedSubmission = sub;
        this.selectedSubmissionData = sub.data;
        // Generate config for all environments
        this.envFormattedSubmissionData = {};
        // Fix: always pass the correct data object
        const confData = sub.data?.data || sub.data;
        for (const env of this.environments) {
          this.envFormattedSubmissionData[env] = this.formatAsConfEnv(confData, env);
        }
        this.formattedSubmissionData = this.envFormattedSubmissionData[this.selectedEnv];
      });
  }

  onEnvTabChange(env: string) {
    this.selectedEnv = env;
    this.formattedSubmissionData = this.envFormattedSubmissionData[env];
  }

  // Helper: Generate config for a specific environment
  private formatAsConfEnv(data: any, env: string): string {
    if (!data) return '';
    let confContent = '';
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const value = data[key];
        // Environment-specific field (object with PROD/DEV/COB keys)
        if (
          value && typeof value === 'object' &&
          (value.PROD !== undefined || value.DEV !== undefined || value.COB !== undefined)
        ) {
          const envVal = value[env];
          if (Array.isArray(envVal) && envVal.length && envVal[0] && typeof envVal[0] === 'object' && 'key' in envVal[0] && 'value' in envVal[0]) {
            // keyvalue type for env-specific
            const obj: any = {};
            envVal.forEach((pair: any) => {
              if (pair.key !== undefined) obj[pair.key] = pair.value !== undefined ? pair.value : '';
            });
            confContent += `${key}=${JSON.stringify(obj)}\n`;
          } else if (Array.isArray(envVal) && envVal.length && typeof envVal[0] === 'string') {
            // MCQ multiple for env-specific
            confContent += `${key}={${envVal.map((v: string) => `"${v}"`).join(",")}}\n`;
          } else if (Array.isArray(envVal) && envVal.length === 0) {
            confContent += `${key}={}\n`;
          } else if (envVal === undefined || envVal === null) {
            confContent += `${key}=""\n`;
          } else {
            confContent += `${key}="${envVal}"\n`;
          }
        }
        // Common keyvalue type (array of {key,value})
        else if (
          Array.isArray(value) &&
          value.length &&
          value[0] &&
          typeof value[0] === 'object' &&
          'key' in value[0] &&
          'value' in value[0]
        ) {
          const obj: any = {};
          value.forEach((pair: any) => {
            if (pair.key !== undefined) obj[pair.key] = pair.value !== undefined ? pair.value : '';
          });
          confContent += `${key}=${JSON.stringify(obj)}\n`;
        } else if (Array.isArray(value) && value.length && typeof value[0] === 'string') {
          // MCQ multiple (non-env)
          confContent += `${key}={${value.map((v: string) => `"${v}"`).join(",")}}\n`;
        } else if (Array.isArray(value) && value.length === 0) {
          confContent += `${key}={}\n`;
        }
        // Primitive value
        else if (typeof value !== 'object' || value === null) {
          confContent += `${key}="${value ?? ''}"\n`;
        }
        // All other objects (not keyvalue, not env-specific): skip
      }
    }
    return confContent;
  }

  addResponse() {
    if (!this.selectedSubmissionName || !this.newResponseContent.trim() || !this.templateName) {
      return;
    }
    const responseData = {
      content: this.newResponseContent,
      author: 'CurrentUser' // Replace with actual user info
    };
    this.schemaService.addResponse(this.templateName, this.selectedSubmissionName, responseData)
      .pipe(takeUntil(this.destroy$))
      .subscribe(newResponse => {
        if (this.selectedSubmission && this.selectedSubmission.responses) {
          this.selectedSubmission.responses.push(newResponse);
        }
        this.newResponseContent = '';
      });
  }

  // Download all configs for all environments as a single zip file
  async downloadSubmission(submissionName: string) {
    if (!this.templateName) return;
    this.schemaService.downloadSubmissionByName(this.templateName, submissionName)
      .pipe(takeUntil(this.destroy$))
      .subscribe(async (submission: any) => {
        const confData = submission.data?.data || submission.data;
        const zip = new JSZip();
        for (const env of this.environments) {
          const confContent = this.formatAsConfEnv(confData, env);
          const fileName = `${submissionName}_${env}.conf`;
          zip.file(fileName, confContent);
        }
        const content = await zip.generateAsync({ type: 'blob' });
        const zipFileName = `${submissionName}_configs.zip`;
        if ('showSaveFilePicker' in window && typeof (window as any).showSaveFilePicker === 'function') {
          try {
            const handle = await (window as any).showSaveFilePicker({
              suggestedName: zipFileName,
              types: [{ description: 'Zip files', accept: { 'application/zip': ['.zip'] } }],
            });
            const writable = await handle.createWritable();
            await writable.write(content);
            await writable.close();
          } catch (err) {
            if ((err as DOMException).name !== 'AbortError') {
              console.error('Could not save zip file:', err);
            }
          }
        } else {
          const url = window.URL.createObjectURL(content);
          const a = document.createElement('a');
          a.href = url;
          a.download = zipFileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }
      });
  }

  toggleVersion(submissionName: string) {
    if (this.selectedVersions.has(submissionName)) {
      this.selectedVersions.delete(submissionName);
    } else {
      if (this.selectedVersions.size < 2) {
        this.selectedVersions.add(submissionName);
      }
    }
  }

  async compareVersions() {
    if (this.selectedVersions.size !== 2 || !this.templateName) return;
    const templateName = this.templateName;
    const versionsToCompare = Array.from(this.selectedVersions);
    const [name1, name2] = versionsToCompare;
    this.schemaService.getSubmissionByName(templateName, name1)
      .pipe(takeUntil(this.destroy$))
      .subscribe(sub1 => {
        this.schemaService.getSubmissionByName(templateName, name2)
          .pipe(takeUntil(this.destroy$))
          .subscribe(sub2 => {
            this.oldSchema = sub1.data ? [sub1.data] : [];
            this.newSchema = sub2.data ? [sub2.data] : [];
            this.selectedSubmissionName = null;
            this.selectedSubmissionData = null;
            this.formattedSubmissionData = null;
            this.diffResult = {
              version1: name1,
              version2: name2
            };
          });
      });
  }

  duplicateAndEdit(submissionName: string) {
    if (!this.templateName) return;
    this.schemaService.getTemplate(this.templateName)
      .pipe(takeUntil(this.destroy$))
      .subscribe(templateResp => {
        const schema = templateResp.schema;
        this.schemaService.getSubmissionByName(this.templateName!, submissionName)
          .pipe(takeUntil(this.destroy$))
          .subscribe(sub => {
            const data = (sub.data && sub.data.data) ? sub.data.data : sub.data;
            const prefillSubmissionData: any = {};
            if (schema && Array.isArray(schema.fields)) {
              schema.fields.forEach((field: any) => {
                const fieldKey = field.key;
                const fieldType = field.type;
                const fieldValue = data ? data[fieldKey] : undefined;
                if (field.environmentSpecific) {
                  // Patch each environment (PROD, DEV, COB)
                  prefillSubmissionData[fieldKey] = { PROD: null, DEV: null, COB: null };
                  ['PROD', 'DEV', 'COB'].forEach(env => {
                    if (fieldValue && fieldValue[env] !== undefined) {
                      if (fieldType === 'keyvalue' && Array.isArray(fieldValue[env])) {
                        prefillSubmissionData[fieldKey][env] = fieldValue[env].map((pair: any) => ({
                          key: pair.key || '',
                          value: pair.value || ''
                        }));
                      } else if (fieldType === 'mcq_multiple' && Array.isArray(fieldValue[env])) {
                        prefillSubmissionData[fieldKey][env] = [...fieldValue[env]];
                      } else {
                        prefillSubmissionData[fieldKey][env] = fieldValue[env];
                      }
                    } else {
                      // If not present, use empty array/object as appropriate
                      if (fieldType === 'keyvalue') prefillSubmissionData[fieldKey][env] = [];
                      else if (fieldType === 'mcq_multiple') prefillSubmissionData[fieldKey][env] = [];
                      else prefillSubmissionData[fieldKey][env] = '';
                    }
                  });
                } else if (fieldType === 'keyvalue' && Array.isArray(fieldValue)) {
                  prefillSubmissionData[fieldKey] = fieldValue.map((pair: any) => ({
                    key: pair.key || '',
                    value: pair.value || ''
                  }));
                } else if (fieldType === 'mcq_multiple' && Array.isArray(fieldValue)) {
                  prefillSubmissionData[fieldKey] = [...fieldValue];
                } else if (fieldValue !== undefined) {
                  prefillSubmissionData[fieldKey] = fieldValue;
                } else {
                  // If not present, use empty array/object as appropriate
                  if (fieldType === 'keyvalue') prefillSubmissionData[fieldKey] = [];
                  else if (fieldType === 'mcq_multiple') prefillSubmissionData[fieldKey] = [];
                  else prefillSubmissionData[fieldKey] = '';
                }
              });
            }
            // Clear any fillerName or name field if present
            if ('fillerName' in prefillSubmissionData) prefillSubmissionData.fillerName = '';
            if ('name' in prefillSubmissionData) prefillSubmissionData.name = '';
            this.duplicateEdit.emit({
              template: this.templateName!,
              prefillSubmissionData
            });
          });
      });
  }

  // Replace confirm in deleteSubmission
  async deleteSubmission(submissionName: string) {
    if (!this.templateName) return;
    const dialogRef = this.dialog.open(InteractiveDialogComponent, {
      width: '350px',
      data: {
        title: 'Delete Submission',
        message: 'Are you sure you want to delete this submission?',
        type: 'confirm'
      }
    });
    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.schemaService.deleteSubmissionByName(this.templateName as string, submissionName)
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
              this.loadSubmissions();
              if (this.selectedSubmissionName === submissionName) {
                this.selectedSubmissionName = null;
                this.selectedSubmission = null;
              }
              this.showPopup('Submission deleted successfully!', 'success');
            });
        }
      });
  }

  // Replace alert in sendSubmissionByEmail
  sendSubmissionByEmail(submissionName: string): void {
    const dialogRef = this.dialog.open(EmailDialogComponent, {
      width: '400px',
      data: { submissionName }
    });
    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(email => {
        if (email && this.templateName) {
          this.schemaService.sendSubmissionByEmail(this.templateName, submissionName, email)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                this.showPopup('Submission sent successfully!', 'airplane');
              },
              error: (err: any) => {
                console.error('Failed to send submission:', err);
                this.showPopup('Failed to send submission. See console for details.', 'error');
              }
            });
        }
      });
  }

  showPopup(message: string, type: 'success' | 'error' | 'airplane' = 'success') {
    this.popupMessage = message;
    this.popupType = type;
    this.popupVisible = true;
    setTimeout(() => {
      this.popupVisible = false;
      if (type === 'airplane') {
        window.location.reload(); // Refresh for important event
      }
    }, 1800);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}