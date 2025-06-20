import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TemplateSchema {
  name: string;
  schema: {
    description?: string;
    fields: any[];
  };
}

export interface Submission {
  version: number;
  data: any;
}

@Injectable({ providedIn: 'root' })
export class SchemaService {
  private apiUrl = 'http://127.0.0.1:8000';

  constructor(private http: HttpClient) {}

  // Template endpoints
  listTemplates(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/templates/`);
  }

  getTemplate(name: string): Observable<TemplateSchema> {
    return this.http.get<TemplateSchema>(`${this.apiUrl}/templates/${name}`);
  }

  createTemplate(template: any): Observable<any> {
    const payload = {
        name: template.name,
        schema: {
            description: template.description,
            fields: template.fields
        }
    };
    return this.http.post(`${this.apiUrl}/templates/`, payload);
  }

  updateTemplate(name: string, template: any): Observable<any> {
     const payload = {
        name: template.name,
        schema: {
            description: template.description,
            fields: template.fields
        }
    };
    return this.http.put(`${this.apiUrl}/templates/${name}`, payload);
  }

  deleteTemplate(name: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/templates/${name}`);
  }

  duplicateTemplate(name: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/templates/${name}/duplicate`, {});
  }

  // Submission endpoints
  submitForm(templateName: string, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/submissions/${templateName}`, data);
  }

  listSubmissions(templateName: string): Observable<Submission[]> {
    return this.http.get<Submission[]>(`${this.apiUrl}/submissions/${templateName}`);
  }

  getSubmission(templateName: string, version: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/submissions/${templateName}/${version}`);
  }

  diffSubmissions(templateName: string, v1: number, v2: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/submissions/${templateName}/diff/${v1}/${v2}`);
  }
}
