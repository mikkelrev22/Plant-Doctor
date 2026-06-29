// import styles from './app.module.css';
import { useEffect, useState } from 'react';
import { Route, Routes, Link } from 'react-router-dom';
import { config } from '../config';

export function App() {
  const [data, setData] = useState<string>("Loading...");

  useEffect(() => {
    fetch('http://localhost:4100/')
      .then(response => response.json())
      .then(data => {
        setData(JSON.stringify(data));
      });
  }, []);


  return (
    <div>
    <div role="navigation">
      <ul>
        <li><Link to="/">Home</Link></li>
        <li><Link to="/page-2">Page 2</Link></li>
      </ul>
    </div>
    <Routes>
      <Route
        path="/"
        element={
          <div>This is the generated root route. <Link to="/page-2">Click here for page 2.</Link></div>
        }
      />
      <Route
        path="/page-2"
        element={
          <div><Link to="/">Click here to go back to root page.</Link></div>
        }
      />
    </Routes>
    
    <hr />
    <div>
      <p>Testing API call at {config.backendUrl}: <b>{data}</b></p>
    </div>

    </div>
  );
}

export default App;


