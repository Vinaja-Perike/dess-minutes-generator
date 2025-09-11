
import React from 'react';
import ReactDOM from 'react-dom/client';
import AppNew from './AppNew';
import App from './App';
import App3 from './App3';
import ZoomVersion from './ZoomVersion';
import GoogleVersion from './App';
import TeamsVersion from './TeamsVersion';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {/* <AppNew/> */}
    {/* <GoogleVersion />  */}
    {/* <ZoomVersion/> */}
    <App3/>
    {/* <TeamsVersion/> */}
  </React.StrictMode>
);
