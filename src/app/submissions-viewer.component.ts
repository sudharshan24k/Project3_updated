import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
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

@Component({
  selector: 'app-submissions-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule, DiffViewerComponent, MatIconModule, MatTooltipModule, MatButtonModule, AnimatedPopupComponent],
  templateUrl: './submissions-viewer.component.html',
  styleUrls: ['./submissions-viewer.component.scss'],
})
export class SubmissionsViewerComponent implements OnInit, OnChanges {
  @Input() templateName: string | null = null;
  @Output() viewTemplate = new EventEmitter<string>();

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
  @Output() duplicateEdit = new EventEmitter<{ template: string, submissionName: string }>();
  newResponseContent: string = '';

  popupMessage: string = '';
  popupType: 'success' | 'error' | 'airplane' = 'success';
  popupVisible = false;

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
    this.schemaService.listSubmissions(this.templateName).subscribe((subs: Submission[]) => {
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
    this.schemaService.getSubmissionByName(this.templateName, submissionName).subscribe(sub => {
      this.selectedSubmission = sub;
      this.selectedSubmissionData = sub.data;
      this.formattedSubmissionData = this.formatAsConf(sub.data);
    });
  }

  private formatAsConf(data: any): string {
    if (!data) return '';
    let confContent = '';
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const value = data[key];
        // Handle keyvalue type: array of {key, value} objects
        if (Array.isArray(value) && value.length && value[0] && typeof value[0] === 'object' && 'key' in value[0] && 'value' in value[0]) {
          // Convert to object {k1: v1, k2: v2, ...}
          const obj: any = {};
          value.forEach((pair: any) => {
            if (pair.key !== undefined) obj[pair.key] = pair.value !== undefined ? pair.value : '';
          });
          confContent += `  ${key} = ${JSON.stringify(obj)}\n`;
        } else {
          confContent += `  ${key} = "${value}"\n`;
        }
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

    this.schemaService.addResponse(this.templateName, this.selectedSubmissionName, responseData).subscribe(newResponse => {
      if (this.selectedSubmission && this.selectedSubmission.responses) {
        this.selectedSubmission.responses.push(newResponse);
      }
      this.newResponseContent = '';
    });
  }

  async downloadSubmission(submissionName: string) {
    if (!this.templateName) return;
    this.schemaService.downloadSubmissionByName(this.templateName, submissionName).subscribe(async (submission: any) => {
      const confContent = this.formatAsConf(submission.data);
      const blob = new Blob([confContent], { type: 'text/plain;charset=utf-8' });
      const fileName = `${submissionName}.conf`;

      if ('showSaveFilePicker' in window && typeof (window as any).showSaveFilePicker === 'function') {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: fileName,
            types: [{ description: 'Config files', accept: { 'text/plain': ['.conf'] } }],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
        } catch (err) {
          if ((err as DOMException).name !== 'AbortError') {
            console.error('Could not save file:', err);
          }
        }
      } else {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
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

    this.schemaService.getSubmissionByName(templateName, name1).subscribe(sub1 => {
      this.schemaService.getSubmissionByName(templateName, name2).subscribe(sub2 => {
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
    this.duplicateEdit.emit({
      template: this.templateName!,
      submissionName: submissionName
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
    const result = await dialogRef.afterClosed().toPromise();
    if (result) {
      this.schemaService.deleteSubmissionByName(this.templateName, submissionName).subscribe(() => {
        this.loadSubmissions();
        if (this.selectedSubmissionName === submissionName) {
          this.selectedSubmissionName = null;
          this.selectedSubmission = null;
        }
        this.showPopup('Submission deleted successfully!', 'success');
      });
    }
  }

  // Replace alert in sendSubmissionByEmail
  sendSubmissionByEmail(submissionName: string): void {
    const dialogRef = this.dialog.open(EmailDialogComponent, {
      width: '400px',
      data: { submissionName }
    });

    dialogRef.afterClosed().subscribe(email => {
      if (email && this.templateName) {
        this.schemaService.sendSubmissionByEmail(this.templateName, submissionName, email).subscribe({
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
}