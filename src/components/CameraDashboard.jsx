import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "./CameraDashboard.css";
import LiveCameraCard from "./LiveCameraCard"; 

const API_URL = "http://127.0.0.1:8000";

// Logo de MCT SAS
const LOGO_URL = "https://media.licdn.com/dms/image/v2/D560BAQG9Eli3VlRvLg/company-logo_200_200/company-logo_200_200/0/1718917065236/mct_sas_logo?e=2147483647&v=beta&t=KabRMRCFsbBga051Fj3_uJImhUgy01Xpfhi3H0YWxh0";

function CameraDashboard({ token, onLogout }) {
  // --- ESTADOS GENERALES ---
  const [dvrs, setDvrs] = useState([]);
  const [selectedDvr, setSelectedDvr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [snapshotUrl, setSnapshotUrl] = useState(null);

  // --- ESTADOS CALENDARIO ---
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDvr, setCalendarDvr] = useState(null);
  const [recordedDays, setRecordedDays] = useState([]); 
  const [totalHistoryDays, setTotalHistoryDays] = useState(null); 
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [viewDate, setViewDate] = useState(new Date()); 

  // --- ESTADOS FILTRO Y ESTADO REAL ---
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [channelStatuses, setChannelStatuses] = useState({}); 

  // Configurar Token Axios
  useEffect(() => {
    if (token) axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }, [token]);

  // 1. Cargar DVRs
  useEffect(() => {
    const fetchCameras = async () => {
      try {
        const response = await axios.get(`${API_URL}/cameras/`);
        setDvrs(response.data);
        if (response.data.length > 0) setSelectedDvr(response.data[0]);
      } catch (error) {
        if (error.response?.status === 401) onLogout();
      } finally {
        setLoading(false);
      }
    };
    fetchCameras();
  }, [onLogout]);

  // Limpiar estados de canales al cambiar DVR
  useEffect(() => {
    setChannelStatuses({});
  }, [selectedDvr]);

  // --- HANDLERS ---

  // Recibe actualización del hijo (LiveCameraCard)
  const handleStatusChange = useCallback((channelId, isOnline) => {
    setChannelStatuses(prev => {
        if (prev[channelId] === isOnline) return prev;
        return { ...prev, [channelId]: isOnline };
    });
  }, []);

  const handleShowSnapshot = async (cameraId) => {
    try {
      const url = `${API_URL}/cameras/${cameraId}/snapshot?t=${Date.now()}`;
      const response = await axios.get(url, { responseType: 'blob' });
      setSnapshotUrl(URL.createObjectURL(response.data));
    } catch (error) {
      alert("No se pudo obtener imagen.");
    }
  };

  // --- FUNCIÓN DE DESCARGA DE REPORTE (CORREGIDA) ---
  const handleDownloadReport = async () => {
    if (!selectedDvr) return;
    
    const confirmDownload = window.confirm(`¿Generar reporte CSV para "${selectedDvr.name}"?\nEsto puede tardar unos segundos mientras se consulta el disco del DVR.`);
    if (!confirmDownload) return;

    try {
      console.log("Solicitando reporte al backend...");
      const response = await axios.get(`${API_URL}/cameras/${selectedDvr.id}/report`, {
        responseType: 'blob', // Clave para descargar archivos
      });

      // Crear enlace de descarga virtual
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Intentar obtener nombre del archivo
      let fileName = `Reporte_${selectedDvr.name}.csv`;
      const disposition = response.headers['content-disposition'];
      if (disposition && disposition.indexOf('attachment') !== -1) {
          const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
          const matches = filenameRegex.exec(disposition);
          if (matches != null && matches[1]) { 
            fileName = matches[1].replace(/['"]/g, '');
          }
      }

      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      console.log("Reporte descargado correctamente.");

    } catch (error) {
      console.error("Error descargando reporte:", error);
      alert("Error al generar el reporte. Verifica que el Backend tenga 'import csv' e 'import io'.");
    }
  };

  // --- LÓGICA CALENDARIO ---
  const handleOpenCalendar = (e, dvr) => {
    e.stopPropagation();
    setCalendarDvr(dvr);
    setShowCalendar(true);
    setViewDate(new Date()); 
    setTotalHistoryDays(null); 
    fetchTotalHistory(dvr.id);
  };

  const fetchTotalHistory = async (dvrId) => {
    try {
      const response = await axios.get(`${API_URL}/cameras/${dvrId}/recordings/total_count`);
      setTotalHistoryDays(response.data.total_recorded_days);
    } catch (error) { console.error(error); }
  };

  const changeMonth = (delta) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setViewDate(newDate);
  };

  useEffect(() => {
    if (!showCalendar || !calendarDvr) return;
    const fetchRecordings = async () => {
      setLoadingCalendar(true);
      setRecordedDays([]); 
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth() + 1;
      try {
        const response = await axios.get(`${API_URL}/cameras/${calendarDvr.id}/recordings`, { params: { year, month } });
        setRecordedDays(response.data.recorded_days);
      } catch (error) { console.error(error); } 
      finally { setLoadingCalendar(false); }
    };
    fetchRecordings();
  }, [viewDate, calendarDvr, showCalendar]);

  const renderCalendarGrid = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthString = String(month + 1).padStart(2, '0');
    let daysElements = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const fullDate = `${year}-${monthString}-${String(i).padStart(2, '0')}`;
      const hasRecording = recordedDays.includes(fullDate);
      daysElements.push(<div key={i} className={`calendar-day ${hasRecording ? 'day-recorded' : ''}`}>{i}</div>);
    }
    return daysElements;
  };

  // --- CÁLCULOS VISUALES ---
  const allChannels = selectedDvr?.children || [];
  const onlineCount = Object.values(channelStatuses).filter(status => status === true).length;
  const totalCount = allChannels.length;
  
  const displayedChannels = showOnlineOnly 
    ? allChannels.filter(c => channelStatuses[c.id] === true) 
    : allChannels;

  if (loading) return <div className="loading">Cargando Sistema CCTV...</div>;

  return (
    <div className="dashboard-container">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <img src={LOGO_URL} alt="MCT SAS" className="app-logo" />
        </div>
        <ul className="dvr-list">
          {dvrs.map((dvr) => (
            <li key={dvr.id} className={`dvr-item ${selectedDvr?.id === dvr.id ? "active" : ""}`} onClick={() => { setSelectedDvr(dvr); setShowOnlineOnly(false); }}>
              <div className="dvr-item-content">
                <div><strong>{dvr.name}</strong><br/><small>{dvr.ip_address}</small></div>
                <button className="btn-calendar-sidebar" onClick={(e) => handleOpenCalendar(e, dvr)} title="Ver grabaciones">📅</button>
              </div>
            </li>
          ))}
        </ul>
        <button onClick={onLogout} className="logout-btn">Cerrar Sesión</button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        {selectedDvr ? (
          <>
            <div className="top-bar">
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                <div>
                  <h1 style={{marginBottom:'5px'}}>{selectedDvr.name}</h1>
                  <div className="dvr-meta">
                    <span className="tag-brand">{selectedDvr.manufacturer || "GENÉRICO"}</span>
                    <span className="tag-model">{selectedDvr.model || "N/A"}</span>
                    <span>• {selectedDvr.ip_address}</span>
                  </div>
                </div>

                {/* BARRA DE CONTROLES */}
                <div className="controls-bar">
                  <button className="btn-report" onClick={handleDownloadReport} title="Descargar CSV">
                    📄 Informe
                  </button>

                  <div className="status-counter">
                    <span style={{color: onlineCount > 0 ? '#2ecc71' : '#e74c3c'}}>● {onlineCount}</span>
                    <small>/ {totalCount} Online</small>
                  </div>

                  <button 
                    className={`filter-toggle ${showOnlineOnly ? 'active' : ''}`}
                    onClick={() => setShowOnlineOnly(!showOnlineOnly)}
                  >
                    {showOnlineOnly ? '👁️ Solo Online' : '👁️ Ver Todas'}
                  </button>
                </div>
              </div>
            </div>

            {/* GRILLA DE CANALES */}
            <div className="channels-grid">
              {displayedChannels.length > 0 ? (
                displayedChannels.map((channel) => (
                  <LiveCameraCard 
                    key={channel.id} 
                    channel={channel} 
                    token={token}
                    onClickSnapshot={handleShowSnapshot}
                    onStatusChange={handleStatusChange}
                  />
                ))
              ) : (
                <div style={{gridColumn: '1/-1', padding:40, textAlign:'center', color:'#7f8c8d', border:'2px dashed #34495e', borderRadius:'10px'}}>
                  <h3>{showOnlineOnly && totalCount > 0 ? "Ninguna cámara Online" : "Sin canales detectados"}</h3>
                </div>
              )}
            </div>
          </>
        ) : <div style={{padding:40}}>Seleccione un DVR</div>}
      </main>

      {/* MODALES */}
      {snapshotUrl && (
        <div className="modal-overlay" onClick={() => setSnapshotUrl(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <img src={snapshotUrl} alt="Snapshot" onLoad={() => URL.revokeObjectURL(snapshotUrl)}/>
            <button className="close-modal" onClick={() => setSnapshotUrl(null)}>Cerrar Foto</button>
          </div>
        </div>
      )}

      {showCalendar && calendarDvr && (
        <div className="modal-overlay" onClick={() => setShowCalendar(false)}>
          <div className="modal-content" style={{ width: '450px' }} onClick={(e) => e.stopPropagation()}>
            <div className="calendar-header" style={{display:'flex', flexDirection:'column', gap:'10px'}}>
              <div style={{textAlign:'center'}}>
                  <h3 style={{margin:0}}>Grabaciones: {calendarDvr.name}</h3>
                  <p className="device-subtitle">{calendarDvr.manufacturer || "DVR"} • {calendarDvr.model}</p>
              </div>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <button className="nav-btn" onClick={() => changeMonth(-1)}>◀</button>
                  <h3 style={{margin:0, color:'#2c3e50'}}>{viewDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()}</h3>
                  <button className="nav-btn" onClick={() => changeMonth(1)}>▶</button>
              </div>
            </div>
            {loadingCalendar ? <div className="loading-calendar">Cargando...</div> : (
              <div className="calendar-container">
                <div style={{ display:'flex', gap:'10px', marginBottom:'15px' }}>
                    <div style={{ flex:1, background:'#ecf0f1', padding:'10px', borderRadius:'8px', textAlign:'center' }}>
                        <div style={{ fontSize:'0.7rem', color:'#7f8c8d' }}>ESTE MES</div>
                        <div style={{ fontSize:'1.4rem', color:'#2980b9', fontWeight:'bold' }}>{recordedDays.length}</div>
                    </div>
                    <div style={{ flex:1, background:'#ecf0f1', padding:'10px', borderRadius:'8px', textAlign:'center' }}>
                        <div style={{ fontSize:'0.7rem', color:'#7f8c8d' }}>HISTÓRICO</div>
                        <div style={{ fontSize:'1.4rem', color:'#e67e22', fontWeight:'bold' }}>{totalHistoryDays !== null ? totalHistoryDays : '...'}</div>
                    </div>
                </div>
                <div className="calendar-grid">{renderCalendarGrid()}</div>
              </div>
            )}
            <button className="close-modal" onClick={() => setShowCalendar(false)}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CameraDashboard;