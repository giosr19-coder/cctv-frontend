import { useState, useEffect } from "react";
import "./CameraDashboard.css"; // Crearemos este CSS en el paso 2

const API_URL = "http://127.0.0.1:8000"; // Ajusta si tu puerto es diferente

function CameraDashboard({ token }) {
  const [dvrs, setDvrs] = useState([]);
  const [selectedDvr, setSelectedDvr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Cargar la lista de DVRs (Padres)
  useEffect(() => {
    const fetchCameras = async () => {
      try {
        const response = await fetch(`${API_URL}/cameras/`, {
          headers: {
            Authorization: `Bearer ${token}`, // Asumiendo que usas JWT
          },
        });
        
        if (!response.ok) throw new Error("Error al cargar cámaras");
        
        const data = await response.json();
        setDvrs(data); // Guardamos la lista de DVRs padres
        
        // Seleccionar el primero por defecto si existe
        if (data.length > 0) {
          setSelectedDvr(data[0]);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCameras();
  }, [token]);

  // Función para refrescar la imagen (simulación de video simple)
  // En un entorno real usarías HLS/WebRTC, pero esto sirve para ver que funciona
  const getSnapshotUrl = (cameraId) => {
    return `${API_URL}/cameras/${cameraId}/snapshot?t=${Date.now()}`;
  };

  if (loading) return <div className="loading">Cargando sistema CCTV...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="dashboard-container">
      {/* --- SIDEBAR: Lista de DVRs --- */}
      <aside className="sidebar">
        <h2>Mis DVRs</h2>
        <ul className="dvr-list">
          {dvrs.map((dvr) => (
            <li 
              key={dvr.id} 
              className={selectedDvr && selectedDvr.id === dvr.id ? "active" : ""}
              onClick={() => setSelectedDvr(dvr)}
            >
              <span className="icon">📼</span>
              <div className="dvr-info">
                <span className="dvr-name">{dvr.name}</span>
                <span className="dvr-ip">{dvr.ip_address}</span>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      {/* --- ÁREA PRINCIPAL: Grilla de Canales del DVR seleccionado --- */}
      <main className="main-content">
        {selectedDvr ? (
          <>
            <header className="main-header">
              <h1>{selectedDvr.name}</h1>
              <span className="badge">
                {selectedDvr.children ? selectedDvr.children.length : 0} Canales
              </span>
            </header>

            <div className="channels-grid">
              {/* Aquí iteramos sobre los HIJOS (children) del DVR seleccionado */}
              {selectedDvr.children && selectedDvr.children.length > 0 ? (
                selectedDvr.children.map((channel) => (
                  <div key={channel.id} className="channel-card">
                    <div className="video-placeholder">
                      {/* Aquí cargamos el snapshot del canal hijo */}
                      <img 
                        src={getSnapshotUrl(channel.id)} 
                        alt={channel.name}
                        onError={(e) => {
                           e.target.src = "https://via.placeholder.com/320x180?text=Sin+Señal"; 
                        }}
                      />
                      <span className="channel-overlay">{channel.name}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-channels">
                  <p>Este DVR no tiene canales detectados.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="empty-state">Seleccione un DVR para ver sus cámaras</div>
        )}
      </main>
    </div>
  );
}

export default CameraDashboard;