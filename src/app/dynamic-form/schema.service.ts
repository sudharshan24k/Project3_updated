import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { tap, shareReplay } from 'rxjs/operators';

export interface TemplateSchema {
  name: string;
  schema: {
    description?: string;
    fields: any[];
  };
  author?: string;
  team_name: string;
  version_tag?: string;
}

export interface TemplateInfo {
  name: string;
  description: string;
  created_at: string;
  author?: string;
  team_name: string;
  version_tag?: string;
  audit_pipeline?: string;
}

export interface TemplateVersion {
  template_name: string;
  version: number;
  schema: any;
  change_log: string;
  created_at: string;
  author?: string;
}

export interface Submission {
  version: number;
  data?: any;
  responses?: Response[];
  submission_name?: string;
}

export interface Response {
  _id?: string;
  submission_id?: string;
  version?: number;
  parent_id?: string;
  author?: string;
  content: string;
  created_at?: string;
  children?: Response[];
}

@Injectable({ providedIn: 'root' })
export class SchemaService {
  private apiUrl = 'http://127.0.0.1:8000';

  private templatesCache: TemplateInfo[] | null = null;
  private templates$: Observable<TemplateInfo[]> | null = null;
  private templateCache: { [name: string]: TemplateSchema } = {};

  private submissionsCache: { [templateName: string]: Submission[] } = {};
  private submissions$: { [templateName: string]: Observable<Submission[]> } = {};
  private submissionCache: { [key: string]: Submission } = {};

  constructor(private http: HttpClient) {}

  // Template endpoints
  listTemplates(): Observable<TemplateInfo[]> {
    if (this.templatesCache) {
      return of(this.templatesCache);
    }
    if (this.templates$) {
      return this.templates$;
    }
    this.templates$ = this.http.get<TemplateInfo[]>(`${this.apiUrl}/templates/`).pipe(
      tap(templates => {
        this.templatesCache = templates;
        this.templates$ = null;
      }),
      shareReplay(1)
    );
    return this.templates$;
  }

  getTemplate(name: string): Observable<TemplateSchema> {
    if (this.templateCache[name]) {
      return of(this.templateCache[name]);
    }
    return this.http.get<TemplateSchema>(`${this.apiUrl}/templates/${name}`).pipe(
      tap(template => {
        this.templateCache[name] = template;
      })
    );
  }

  createTemplate(template: any): Observable<any> {
    const payload = {
        name: template.name,
        schema: {
            description: template.description,
            fields: template.fields,
            audit_pipeline: template.audit_pipeline
        },
        author: template.author,
        team_name: template.team_name,
        version_tag: template.version
    };
    return this.http.post(`${this.apiUrl}/templates/`, payload).pipe(
      tap(() => this.clearTemplatesCache())
    );
  }

  updateTemplate(name: string, schema: any, change_log: string): Observable<any> {
    const payload = {
      schema,
      change_log,
      version_tag: schema.version,
      author: schema.author,
      team_name: schema.team_name
    };
    return this.http.put(`${this.apiUrl}/templates/${name}`, payload).pipe(
      tap(() => this.clearTemplatesCache())
    );
  }

  deleteTemplate(name: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/templates/${name}`).pipe(
      tap(() => this.clearTemplatesCache())
    );
  }

  private clearTemplatesCache() {
    this.templatesCache = null;
    this.templates$ = null;
    this.templateCache = {};
  }

  duplicateTemplate(name: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/templates/${name}/duplicate`, {});
  }

  // Versioning endpoints
  getTemplateHistory(name: string): Observable<TemplateVersion[]> {
    return this.http.get<TemplateVersion[]>(`${this.apiUrl}/templates/${name}/history`);
  }

  rollbackTemplate(name: string, version: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/templates/${name}/rollback/${version}`, {});
  }

  /**
   * Create a new version of a template (versioned schema)
   * Calls backend endpoint to create a new version (e.g. name_v2, name_v3, ...)
   */
  createNewVersion(name: string, schema: any, change_log: string): Observable<any> {
    const payload = {
      schema,
      change_log,
      version_tag: schema.version,
      author: schema.author,
      team_name: schema.team_name
    };
    // Backend should handle version increment and naming
    return this.http.post(`${this.apiUrl}/templates/${name}/newversion`, payload);
  }

  // Helper to build a cache key for submissions
  private buildSubmissionsCacheKey(templateName: string, filters?: any, page?: number, pageSize?: number): string {
    return [
      templateName,
      filters ? JSON.stringify(filters) : '',
      page !== undefined ? page : '',
      pageSize !== undefined ? pageSize : ''
    ].join('|');
  }

  listSubmissions(templateName: string, filters?: any, page?: number, pageSize?: number): Observable<Submission[]> {
    const cacheKey = this.buildSubmissionsCacheKey(templateName, filters, page, pageSize);
    if (this.submissionsCache[cacheKey]) {
      return of(this.submissionsCache[cacheKey]);
    }
    if (this.submissions$[cacheKey]) {
      return this.submissions$[cacheKey];
    }
    // Build query params
    let params: any = {};
    if (filters) {
      Object.keys(filters).forEach(key => {
        params[key] = filters[key];
      });
    }
    if (page !== undefined) params.page = page;
    if (pageSize !== undefined) params.pageSize = pageSize;
    this.submissions$[cacheKey] = this.http.get<Submission[]>(`${this.apiUrl}/submissions/${templateName}`, { params }).pipe(
      tap(subs => {
        this.submissionsCache[cacheKey] = subs;
        delete this.submissions$[cacheKey];
      }),
      shareReplay(1)
    );
    return this.submissions$[cacheKey];
  }

  getSubmission(templateName: string, version: number): Observable<Submission> {
    const key = `${templateName}::${version}`;
    if (this.submissionCache[key]) {
      return of(this.submissionCache[key]);
    }
    return this.http.get<Submission>(`${this.apiUrl}/submissions/${templateName}/${version}`).pipe(
      tap(sub => {
        this.submissionCache[key] = sub;
      })
    );
  }

  submitForm(templateName: string, submission: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/submissions/${templateName}`, submission).pipe(
      tap(() => this.clearSubmissionsCache(templateName))
    );
  }

  updateSubmission(templateName: string, version: number, submission: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/submissions/${templateName}/${version}`, submission).pipe(
      tap(() => this.clearSubmissionsCache(templateName))
    );
  }

  deleteSubmission(templateName: string, version: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/submissions/${templateName}/${version}`).pipe(
      tap(() => this.clearSubmissionsCache(templateName))
    );
  }

  private clearSubmissionsCache(templateName: string) {
    // Remove all cache entries for this template (regardless of filters/page)
    Object.keys(this.submissionsCache).forEach(key => {
      if (key.startsWith(templateName + '|')) {
        delete this.submissionsCache[key];
      }
    });
    Object.keys(this.submissions$).forEach(key => {
      if (key.startsWith(templateName + '|')) {
        delete this.submissions$[key];
      }
    });
    // Remove all cached submissions for this template
    Object.keys(this.submissionCache).forEach(key => {
      if (key.startsWith(templateName + '::')) {
        delete this.submissionCache[key];
      }
    });
  }

  duplicateSubmission(templateName: string, version: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/submissions/${templateName}/${version}/duplicate`, {});
  }

  // Response endpoints
  // --- Per-response endpoints (by templateName and submissionName) ---
  getSubmissionByName(templateName: string, submissionName: string): Observable<Submission> {
    return this.http.get<Submission>(`${this.apiUrl}/submissions/${templateName}/by-name/${submissionName}`);
  }

  duplicateSubmissionByName(templateName: string, submissionName: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/submissions/${templateName}/by-name/${submissionName}/duplicate`, {});
  }

  deleteSubmissionByName(templateName: string, submissionName: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/submissions/${templateName}/by-name/${submissionName}`);
  }

  addResponse(templateName: string, submissionName: string, response: { content: string, author: string, parent_id?: string }): Observable<Response> {
    return this.http.post<Response>(`${this.apiUrl}/submissions/${templateName}/by-name/${submissionName}/responses`, response);
  }

  // Add downloadSubmissionByName using templateName and submissionName
  downloadSubmissionByName(templateName: string, submissionName: string): Observable<Submission> {
    return this.http.get<Submission>(`${this.apiUrl}/submissions/${templateName}/by-name/${submissionName}`);
  }

  sendSubmissionByEmail(templateName: string, submissionName: string, email: string): Observable<any> {
    const payload = {
      template_name: templateName,
      submission_name: submissionName,
      email: email,
    };
    // This will be replaced with a real API call
    return of({ success: true, message: 'Email sent successfully (mocked).' });
  }

  /**
   * Search submissions by filler name
   */
  searchSubmissionsByFiller(fillerName: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/submissions/search-by-filler?fillerName=${encodeURIComponent(fillerName)}`);
  }
}