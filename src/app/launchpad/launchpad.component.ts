import { Component, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-launchpad',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './launchpad.component.html',
  styleUrls: ['./launchpad.component.scss']
})
export class LaunchpadComponent {
  @Output() navigate = new EventEmitter<any>();

  constructor(private router: Router) {}

  navigateToDashboard() {
    this.navigate.emit({ view: 'dashboard', team: 'application' });
  }

  navigateToCreateTemplate() {
    this.navigate.emit({ view: 'dashboard', team: 'framework' });
  }
}