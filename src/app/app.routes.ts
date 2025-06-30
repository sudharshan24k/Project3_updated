import { DashboardComponent } from './dashboard.component';
import { DynamicForm } from './dynamic-form/dynamic-form.component';
import { Routes } from '@angular/router';
import { TemplateHistoryComponent } from './template-history/template-history.component';
import { HelpdeskComponent } from './helpdesk.component';
import { LaunchpadComponent } from './launchpad/launchpad.component';
import { ApplicationDashboardComponent } from './application-dashboard/application-dashboard.component';
import { passwordGuard } from './auth/password.guard';

export const routes: Routes = [
  { path: '', component: LaunchpadComponent },
  { path: 'dashboard', component: DashboardComponent },
  { 
    path: 'app-dashboard', 
    component: ApplicationDashboardComponent,
    canActivate: [passwordGuard]
  },
  { 
    path: 'form/create', 
    component: DynamicForm, 
    data: { mode: 'create' }
  },
  { path: 'form/edit/:templateName', component: DynamicForm, data: { mode: 'edit' } },
  { path: 'form/use/:templateName', component: DynamicForm, data: { mode: 'use' } },
  { path: 'form/preview/:templateName', component: DynamicForm, data: { mode: 'preview' } },
  { path: 'history/:templateName', component: TemplateHistoryComponent },
  { path: 'helpdesk', component: HelpdeskComponent },
  { path: 'form/submissions/:templateName/:submissionName', component: DynamicForm, data: { mode: 'use' } },
  { path: '**', redirectTo: '' }
];
