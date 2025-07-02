import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ApplicationDashboardListComponent } from './application-dashboard-list.component';

@Component({
  selector: 'app-application-dashboard',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule, ApplicationDashboardListComponent],
  templateUrl: './application-dashboard.component.html',
  styleUrls: ['./application-dashboard.component.scss']
})
export class ApplicationDashboardComponent {
  @Output() navigate = new EventEmitter<any>();
  @Output() back = new EventEmitter<void>();

  navigateToCreateTemplate() {
    this.navigate.emit({ view: 'form', mode: 'create' });
  }

  goToLaunchpad() {
    this.back.emit();
  }
} 