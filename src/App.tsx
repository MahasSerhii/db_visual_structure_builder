import React from 'react';
import { ToastProvider } from './context/ToastContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { WorkspaceLayout } from './components/Layout/WorkspaceLayout';
import './styles/index.css';
import { BrowserRouter } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
        <ToastProvider>
            <WorkspaceProvider>
                <WorkspaceLayout />
            </WorkspaceProvider>
        </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
