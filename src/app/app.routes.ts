import { DashboardComponent } from './dashboard.component';
import { DynamicForm } from './dynamic-form/dynamic-form';
import { Routes } from '@angular/router';
import { TemplateHistoryComponent } from './template-history/template-history.component';
import { HelpdeskComponent } from './helpdesk.component';

export const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'form/:name/:version', component: DynamicForm },
  { path: 'form/:name', component: DynamicForm },
  { path: 'history/:name', component: TemplateHistoryComponent },
  { path: 'helpdesk', component: HelpdeskComponent },
  { path: '**', redirectTo: '' }
];
