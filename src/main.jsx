import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './tailwind.css';
import App from './App.jsx';
import { Provider } from 'react-redux';
import { store } from './store';
import { ThemeProvider } from './lib/vaultTheme';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import WorkflowPage from './components/ui/WorkflowPage';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/workflows/:id" element={<WorkflowPage />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  </StrictMode>,
);
