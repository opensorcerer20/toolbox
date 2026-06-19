import { render } from 'preact';
import { migrate } from './store';
import App from './App';

migrate();
render(<App />, document.getElementById('app'));
