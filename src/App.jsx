import { useState } from 'react';
import './App.css'; // Puedes dejar el css global si tiene reset styles
import Login from './components/Login';
import CameraDashboard from './components/CameraDashboard'; // Importamos el nuevo dashboard

function App() {
  // Estado para el token
  const [token, setToken] = useState(localStorage.getItem('authToken'));

  // Guardar token al loguearse
  const handleLoginSuccess = (receivedToken) => {
    localStorage.setItem('authToken', receivedToken);
    setToken(receivedToken);
  };

  // Borrar token al salir
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setToken(null);
  };

  // RENDERIZADO CONDICIONAL SIMPLE
  return (
    <div className="App">
      {!token ? (
        // Si NO hay token -> Mostramos Login
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        // Si HAY token -> Mostramos el Dashboard nuevo
        <CameraDashboard token={token} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;