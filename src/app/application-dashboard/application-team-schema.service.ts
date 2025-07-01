import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AppTeamTemplateInfo {
  name: string;
  description: string;
  created_at: string;
  author?: string;
  team_name: string;
  version_tag?: string;
  audit_pipeline?: string;
}

@Injectable({ providedIn: 'root' })
export class ApplicationTeamSchemaService {
  private apiUrl = 'http://127.0.0.1:8000';

  constructor(private http: HttpClient) {}

  listTemplates(): Observable<AppTeamTemplateInfo[]> {
    return this.http.get<AppTeamTemplateInfo[]>(`${this.apiUrl}/app-team-templates/`);
  }

  getTemplate(name: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/app-team-templates/${name}`);
  }

  createTemplate(template: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/app-team-templates/`, template);
  }

  updateTemplate(name: string, template: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/app-team-templates/${name}`, template);
  }

  deleteTemplate(name: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/app-team-templates/${name}`);
  }
} 