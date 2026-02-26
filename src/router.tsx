import { createHashRouter } from 'react-router-dom';
import App from './App';
import SimulatorPage from './pages/SimulatorPage';
import ListAnalyzerPageRoute from './pages/ListAnalyzerPage';

export const router = createHashRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <SimulatorPage /> },
      { path: 'list', element: <ListAnalyzerPageRoute /> },
    ],
  },
]);
