// main.jsx or index.jsx
import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './screens/landing';

const ZoomVersion = lazy(() => import('./ZoomVersion'));
const TeamsVersion = lazy(() => import('./TeamsVersion'));
const GoogleVersion = lazy(() => import('./App')); // your Google Meet screen

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/zoom" element={<ZoomVersion />} />
          <Route path="/teams" element={<TeamsVersion />} />
          <Route path="/google" element={<GoogleVersion />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </React.StrictMode>
);
