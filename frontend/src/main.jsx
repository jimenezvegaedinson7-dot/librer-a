import { createRoot } from 'react-dom';
import { AppRouter } from './routes';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/theme.css';

const appRoot = document.getElementById('app');

createRoot(appRoot).render(
    <AppRouter />
);