import { useState, useEffect, useRef } from "react";
import axios from "axios";

const API_URL = "http://127.0.0.1:8000";

// Agregamos onStatusChange a las props
function LiveCameraCard({ channel, token, onClickSnapshot, onStatusChange }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [isError, setIsError] = useState(false);
  
  // Usamos useRef para guardar el último estado reportado y evitar bucles infinitos
  const lastReportedStatus = useRef(null); 

  useEffect(() => {
    let intervalId;
    let isMounted = true;

    const fetchSnapshot = async () => {
      try {
        const url = `${API_URL}/cameras/${channel.id}/snapshot?t=${Date.now()}`;
        
        const response = await axios.get(url, { 
            responseType: 'blob',
            headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!isMounted) return;

        const newUrl = URL.createObjectURL(response.data);
        setImageSrc((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return newUrl;
        });
        
        setIsError(false);

        // AVISAR AL PADRE: ESTOY ONLINE
        if (lastReportedStatus.current !== 'online') {
            onStatusChange(channel.id, true); // true = online
            lastReportedStatus.current = 'online';
        }

      } catch (error) {
        if (!isMounted) return;
        setIsError(true);

        // AVISAR AL PADRE: ESTOY OFFLINE
        if (lastReportedStatus.current !== 'offline') {
            onStatusChange(channel.id, false); // false = offline
            lastReportedStatus.current = 'offline';
        }
      }
    };

    // Primera carga inmediata
    fetchSnapshot();

    // Intervalo de 3 segundos
    intervalId = setInterval(fetchSnapshot, 3000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      if (imageSrc) URL.revokeObjectURL(imageSrc);
    };
  }, [channel.id, token, onStatusChange]);

  return (
    <div className={`channel-card ${isError ? "error-state" : "online-state"}`}>
      <div className="video-box">
        {imageSrc && !isError ? (
            <img src={imageSrc} alt={channel.name} className="live-image" />
        ) : (
            <div className="placeholder">
                <span style={{fontSize:'2rem', opacity:0.5}}>📶</span>
                <span style={{color:'#777', marginTop:'5px', fontSize:'0.8rem'}}>
                    {isError ? "Sin Señal" : "Conectando..."}
                </span>
            </div>
        )}
        
        {!isError && <div className="live-indicator">LIVE</div>}
      </div>

      <div className="channel-info">
        <div className="channel-text">
          <strong title={channel.name} style={{
              display:'block', 
              whiteSpace:'nowrap', 
              overflow:'hidden', 
              textOverflow:'ellipsis', 
              maxWidth:'120px'
          }}>
              {channel.name}
          </strong>
          
          <div className="status-row">
             <span className={`status-dot ${isError ? "red" : "green"}`}></span>
             <small>{isError ? "Offline" : "En línea"}</small>
          </div>
        </div>
        <button className="btn-snapshot" onClick={() => onClickSnapshot(channel.id)} title="Ver en grande">
          🔍
        </button>
      </div>
    </div>
  );
}

export default LiveCameraCard;