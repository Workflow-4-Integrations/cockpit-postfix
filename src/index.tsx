import React from 'react';
import { createRoot } from 'react-dom/client';
import 'cockpit-dark-theme';
import { Application } from './app';
import '../node_modules/@patternfly/patternfly/patternfly.css';
import './app.scss';

document.addEventListener('DOMContentLoaded', () => {
  createRoot(document.getElementById('app')!).render(<Application />);
});
