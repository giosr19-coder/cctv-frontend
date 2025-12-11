import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import axios from 'axios';
import './CameraDashboard.css';

// Registrar componentes de gráficos
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const API_URL = "http://127.0.0.1:8000";

function AnalyticsModal({ dvr, token, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${API_URL}/cameras/${dvr.id}/analytics/summary`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setData(response.data);
      } catch (error) {
        console.error("Error cargando analíticas", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dvr, token]);

  if (!dvr) return null;

  // Opciones del gráfico
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top', labels: { color: '#ecf0f1' } },
      title: { display: true, text: 'Flujo de Personas (Hoy)', color: '#ecf0f1' },
    },
    scales: {
      x: { ticks: { color: '#bdc3c7' }, grid: { color: '#34495e' } },
      y: { ticks: { color: '#bdc3c7' }, grid: { color: '#34495e' } }
    }
  };

  // Datos del gráfico (protegidos contra nulos)
  const chartData = {
    labels: data?.people_counting?.map(c => c.channel_name) || [],
    datasets: [
      {
        label: 'Entradas',
        data: data?.people_counting?.map(c => c.entered) || [],
        backgroundColor: 'rgba(46, 204, 113, 0.7)',
      },
      {
        label: 'Salidas',
        data: data?.people_counting?.map(c => c.exited) || [],
        backgroundColor: 'rgba(231, 76, 60, 0.7)',
      },
    ],
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{width: '800px', maxWidth:'95%', backgroundColor: '#1e272e', color: 'white', border: '1px solid #34495e'}} onClick={e => e.stopPropagation()}>
        
        <div style={{borderBottom:'1px solid #34495e', paddingBottom:'10px', marginBottom:'20px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div>
                <h2 style={{margin:0}}>Tablero de Control</h2>
                <small style={{color:'#95a5a6'}}>{dvr.name} • {dvr.ip_address}</small>
            </div>
            <button className="close-modal" onClick={onClose} style={{width:'auto', padding:'5px 15px', marginTop:0}}>X</button>
        </div>

        {loading ? (
          <div className="loading-calendar"><p>Calculando estadísticas...</p></div>
        ) : (
          <div className="analytics-container">
            
            {/* KPI CARDS */}
            <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'15px', marginBottom:'20px'}}>
                
                <div style={{background:'#2c3e50', padding:'15px', borderRadius:'8px', textAlign:'center'}}>
                    <div style={{fontSize:'2rem', fontWeight:'bold', color:'#f1c40f'}}>{data.retention_days}</div>
                    <div style={{fontSize:'0.7rem', color:'#bdc3c7', letterSpacing:'1px'}}>DÍAS GRABADOS</div>
                </div>

                <div style={{background:'#2c3e50', padding:'15px', borderRadius:'8px', textAlign:'center'}}>
                    <div style={{fontSize:'2rem', fontWeight:'bold', color: '#2ecc71'}}>
                        {data.total_channels > 0 ? Math.round((data.online_channels / data.total_channels) * 100) : 0}%
                    </div>
                    <div style={{fontSize:'0.7rem', color:'#bdc3c7', letterSpacing:'1px'}}>OPERATIVIDAD</div>
                </div>

                <div style={{background:'#2c3e50', padding:'15px', borderRadius:'8px', textAlign:'center'}}>
                    <div style={{fontSize:'2rem', fontWeight:'bold', color:'#3498db'}}>
                        {data.online_channels}/{data.total_channels}
                    </div>
                    <div style={{fontSize:'0.7rem', color:'#bdc3c7', letterSpacing:'1px'}}>CANALES ONLINE</div>
                </div>
            </div>

            {/* GRÁFICO */}
            <div style={{background:'#2c3e50', padding:'20px', borderRadius:'8px'}}>
                {data.people_counting && data.people_counting.some(c => c.entered > 0 || c.exited > 0) ? (
                    <Bar options={chartOptions} data={chartData} />
                ) : (
                    <div style={{textAlign:'center', padding:'30px', color:'#7f8c8d'}}>
                        <p>No hay datos de conteo de personas disponibles para hoy.</p>
                    </div>
                )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

export default AnalyticsModal;