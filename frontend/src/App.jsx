import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Upload, Play, Pause, SkipBack, SkipForward, Save, Trash2, X, RefreshCw } from 'lucide-react';
import './App.css';

const VEHICLE_TYPES = [
  { type: "Carro", key: "q" },
  { type: "moto", key: "w" },
  { type: "2CB", key: "e" },
  { type: "3CB", key: "r" },
  { type: "4CB", key: "t" },
  { type: "2C", key: "p" },
  { type: "3C", key: "a" },
  { type: "4C", key: "s" },
  { type: "2S1", key: "d" },
  { type: "2S2", key: "f" },
  { type: "3S1", key: "g" },
  { type: "2S3", key: "h" },
  { type: "3S2", key: "j" },
  { type: "3S3", key: "k" },
  { type: "3T4", key: "l" },
  { type: "Van", key: "z" }
];

// NOTE: The 'Space' key is reserved for Play/Pause and should not be used in VEHICLE_TYPES.

function App() {
  const [videoSrc, setVideoSrc] = useState(null);
  const [direction, setDirection] = useState("1");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [counts, setCounts] = useState([]);
  const [startTime, setStartTime] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    // return YYYY-MM-DDTHH:MM:SS
    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 19);
  });
  const [notification, setNotification] = useState("");
  const [lastAdded, setLastAdded] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [syncPoints, setSyncPoints] = useState([]);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [newSyncTime, setNewSyncTime] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [lastPeriodicSync, setLastPeriodicSync] = useState(0);
  const [exportFileName, setExportFileName] = useState("eventos_manual");

  const apiKey = import.meta.env.VITE_MOONDREAM_API_KEY;

  const videoRef = useRef(null);

  // ---------- MOONDREAM OCR LOGIC ----------
  const extractTimeFromFrame = async (videoEl) => {
    try {
      const canvas = document.createElement("canvas");
      // Grab top-left corner where time usually is (adjust width/height if needed)
      canvas.width = Math.min(800, videoEl.videoWidth || 800);
      canvas.height = Math.min(100, videoEl.videoHeight || 100); 
      const ctx = canvas.getContext("2d");
      ctx.drawImage(videoEl, 0, 0, videoEl.videoWidth, videoEl.videoHeight, 0, 0, videoEl.videoWidth, videoEl.videoHeight);
      
      const base64Image = canvas.toDataURL("image/jpeg", 0.9).split(',')[1];

      const res = await fetch("https://api.moondream.ai/v1/query", {
        method: "POST",
        headers: {
          "X-Moondream-Auth": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          image_url: `data:image/jpeg;base64,${base64Image}`,
          question: "The image contains a timestamp exactly in the format 'YYYY-MM-DD HH:MM:SS' (Year-Month-Day Hour:Minute:Second). Read the text EXACTLY as it appears on the image without changing the order of the numbers. Return ONLY the string. Example: '2026-03-18 08:52:29'."
        })
      });
      const data = await res.json();
      return data.answer.trim();
    } catch(e) {
      console.error("Moondream Error:", e);
      return null;
    }
  };

  const runInitialSync = async () => {
    if (!videoRef.current) return;
    setIsVerifying(true);
    const v = videoRef.current;
    const ct = v.currentTime;
    
    showNotification(`Analisando OCR no segundo ${Math.floor(ct)}...`);
    const timeStr = await extractTimeFromFrame(v);
    
    if (timeStr && timeStr !== "ERROR" && timeStr.length >= 10) {
      // Extrai usando regex garantindo a leitura no padrao da camera (ANO-MES-DIA HORA:MIN:SEG)
      const match = timeStr.match(/(\d{4})[-/](\d{2})[-/](\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
      
      if (match) {
        const [, year, month, day, hour, minute, second] = match;
        const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
        const d = new Date(isoString);
        
        if (!isNaN(d.getTime())) {
          // Atualiza a ancoragem
          setSyncPoints(prev => [...prev, { videoTime: ct, realTime: d }]);
          // Atualiza tbm o startTime para visualizacao se for no inicio
          if (ct < 5) setStartTime(formatDateTimeISO(d));
          
          const brFormat = `${day}-${month}-${year} ${hour}:${minute}:${second}`;
          showNotification(`Sucesso! Ancorado em: ${brFormat}`);
        } else {
           showNotification("Erro: O Moondream retornou um formato inválido: " + timeStr);
        }
      } else {
         showNotification("Erro: Formato lido não foi reconhecido: " + timeStr);
      }
    } else {
      showNotification("Erro: O Moondream não conseguiu ler a data/hora com clareza. Tente em outro segundo.");
    }
    
    setIsVerifying(false);
  };
  // ----------------------------------------

  useEffect(() => {
    let d;
    if (startTime.length === 16) {
      d = new Date(startTime + ":00");
    } else {
      d = new Date(startTime);
    }
    if (!isNaN(d.getTime())) {
      setSyncPoints([{ videoTime: 0, realTime: d }]);
    }
  }, [startTime]);

  const getCalculatedRealTime = (vidTime) => {
    if (syncPoints.length === 0) return new Date();
    const sorted = [...syncPoints].sort((a, b) => a.videoTime - b.videoTime);
    let activeSync = sorted[0];
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].videoTime <= vidTime) {
        activeSync = sorted[i];
      }
    }
    const diffMs = (vidTime - activeSync.videoTime) * 1000;
    return new Date(activeSync.realTime.getTime() + diffMs);
  };

  const formatDateTimeISO = (d) => {
    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 19);
  };

  const formatDateTimeBR = (d) => {
    const pad = n => n.toString().padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const formatDateTimeShortBR = (d) => {
    const pad = n => n.toString().padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleAddSyncPoint = () => {
    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    setNewSyncTime(formatDateTimeISO(getCalculatedRealTime(videoRef.current ? videoRef.current.currentTime : 0)));
    setShowSyncModal(true);
  };

  const saveSyncPoint = () => {
    if (!videoRef.current) return;
    const vTime = videoRef.current.currentTime;
    const rTime = new Date(newSyncTime);
    if (!isNaN(rTime.getTime())) {
      setSyncPoints(prev => [...prev, { videoTime: vTime, realTime: rTime }]);
      setShowSyncModal(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (!videoSrc) return;

      // Handle Spacebar first (Priority)
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePlay();
        return;
      }

      const key = e.key.toLowerCase();
      const isShift = e.shiftKey;

      if (key === 'arrowleft') {
        if (videoRef.current) videoRef.current.currentTime -= 5;
        return;
      }
      if (key === 'arrowright') {
        if (videoRef.current) videoRef.current.currentTime += 5;
        return;
      }

      const v = VEHICLE_TYPES.find(v => v.key === key);
      if (v) {
        if (isShift) {
          removeLastVehicleOfType(v.type);
        } else {
          addVehicle(v.type);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [videoSrc, isPlaying]); // Added isPlaying to deps to ensure togglePlay has latest state if needed, though togglePlay uses ref mostly. actually togglePlay uses isPlaying state.

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      
      // Define o nome da planilha com base no nome do arquivo (removendo a extensão)
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      setExportFileName(nameWithoutExt);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleRemoveVideo = () => {
    if (counts.length > 0) {
      if (!window.confirm("Deseja realmente trocar de vídeo? As contagens atuais serão limpas.")) {
        return;
      }
    }
    if (videoSrc) {
      URL.revokeObjectURL(videoSrc);
    }
    setVideoSrc(null);
    setIsPlaying(false);
    setCounts([]);
    setCurrentTimeDisplay(0);
    setSyncPoints([]);
    setLastPeriodicSync(0);
  };

  const addVehicle = (type) => {
    const time = videoRef.current ? videoRef.current.currentTime : 0;
    const realDate = getCalculatedRealTime(time);

    const newCount = {
      id: Date.now() + Math.random(),
      type: type,
      video_time_sec: time,
      direction: parseInt(direction),
      real_time_str: formatDateTimeShortBR(realDate)
    };
    setCounts(prev => [...prev, newCount]);
    
    setLastAdded(type);
    setTimeout(() => setLastAdded(null), 300);
  };

  const removeLastVehicleOfType = (type) => {
    setCounts(prev => {
      const idx = prev.map(c => c.type).lastIndexOf(type);
      if (idx !== -1) {
        const newCounts = [...prev];
        newCounts.splice(idx, 1);
        return newCounts;
      }
      return prev;
    });
  };

  const removeSpecificCount = (id) => {
    setCounts(prev => prev.filter(c => c.id !== id));
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const [currentTimeDisplay, setCurrentTimeDisplay] = useState(0);
  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        if (videoRef.current) {
          const ct = videoRef.current.currentTime;
          setCurrentTimeDisplay(ct);
          
          // Periodic OCR Sync (Every 15 mins = 900s)
          if (ct > 0 && ct - lastPeriodicSync >= 900) {
            setLastPeriodicSync(ct);
            (async () => {
              showNotification(`Verificação OCR periódica aos ${Math.floor(ct)}s...`);
              const timeStr = await extractTimeFromFrame(videoRef.current);
              if (timeStr && timeStr !== "ERROR" && timeStr.length >= 19) {
                 const d = new Date(timeStr.replace(" ", "T"));
                 if (!isNaN(d.getTime())) {
                    setSyncPoints(prev => [...prev, { videoTime: ct, realTime: d }]);
                    showNotification("Âncora periódica de 15min registrada com sucesso!");
                 }
              }
            })();
          }
        }
      }, 500);
    } else {
      if (videoRef.current) {
        setCurrentTimeDisplay(videoRef.current.currentTime);
      }
    }
    return () => clearInterval(interval);
  }, [isPlaying, lastPeriodicSync]);

  const stats = useMemo(() => {
    const s = {};
    VEHICLE_TYPES.forEach(v => s[v.type] = 0);
    counts.forEach(c => {
      if (s[c.type] !== undefined) s[c.type]++;
    });
    return s;
  }, [counts]);

  const handleFinish = () => {
    if (counts.length === 0) {
      showNotification("Nenhum veículo contado!");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const headers = ["video_id", "direcao", "categoria", "frame_idx", "video_ms", "track_id", "real_datetime", "fonte_tempo"];
      
      const fileName = exportFileName || "eventos_manual";
      
      const rows = counts.map(c => {
        const ms = Math.floor(c.video_time_sec * 1000);
        let cat = c.type.toLowerCase();
        if (cat === "carro") cat = "automovel";
        if (cat === "caminhao 8 eixos") cat = "3d4";
        return `${fileName},${c.direction},${cat},0,${ms},0,${c.real_time_str},manual`;
      });
      
      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${fileName}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showNotification("Planilha exportada com sucesso (Download concluído)!");
      
    } catch (err) {
      console.error(err);
      showNotification("Erro ao gerar a planilha CSV.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 5000);
  };

  return (
    <div className="app-container">
      {notification && <div className="notification">{notification}</div>}
      
      <div className="main-content">
        <div className="header">
          <div>
            <h1>Contador de tráfego</h1>
            <div className="keyboard-shortcut-hint" style={{ textAlign: 'left', marginTop: '5px' }}>
              <strong>ESPAÇO:</strong> Pausar/Play | <strong>← →</strong>: -/+ 5s | <strong>Shift + Tecla</strong>: Remove veiculo
            </div>
          </div>
          {videoSrc && (
            <div style={{display: 'flex', gap: '10px'}}>
              <button onClick={runInitialSync} disabled={isVerifying} style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', cursor: isVerifying ? 'not-allowed' : 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', opacity: isVerifying ? 0.7 : 1 }}>
                <RefreshCw size={20} className={isVerifying ? "spin-anim" : ""} />
                {isVerifying ? "Analisando..." : "Sincronizar Auto (OCR)"}
              </button>
              <button onClick={handleRemoveVideo} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', transition: 'transform 0.2s' }}>
                <X size={20} />
                Trocar Vídeo
              </button>
            </div>
          )}
        </div>

        {!videoSrc ? (
          <div className="upload-section">
            <Upload size={48} color="#3b82f6" style={{ marginBottom: 15 }} />
            <h2>Faça upload do seu vídeo</h2>
            <p style={{ color: '#94a3b8', textAlign: 'center', marginBottom: 20 }}>
              O Moondream será simulado com um aviso sonoro no final :)
            </p>
            <label className="upload-label">
              <Upload size={20} />
              Escolher Vídeo
              <input 
                type="file" 
                accept="video/*" 
                onChange={handleVideoUpload} 
                style={{ display: 'none' }} 
              />
            </label>
          </div>
        ) : (
          <div className="video-container">
            <video 
              ref={videoRef} 
              src={videoSrc} 
              onLoadedData={runInitialSync}
              onEnded={() => {
                setIsPlaying(false);
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
            
            <div className="controls-bar">
              <div className="timeline-container">
                <input 
                  type="range" 
                  min={0} 
                  max={videoRef.current?.duration || 100} 
                  value={currentTimeDisplay}
                  onChange={(e) => {
                    const time = parseFloat(e.target.value);
                    if (videoRef.current) {
                      videoRef.current.currentTime = time;
                      setCurrentTimeDisplay(time);
                    }
                  }}
                />
                <div style={{display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '5px'}}>
                  <span>{formatTime(currentTimeDisplay)} / {videoRef.current?.duration ? formatTime(videoRef.current.duration) : "00:00:00"}</span>
                  <span style={{color: '#10b981', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px'}}>
                    Hora da Câmera: {formatDateTimeBR(getCalculatedRealTime(currentTimeDisplay))}
                    <button 
                      onClick={handleAddSyncPoint}
                      style={{marginLeft: '10px', fontSize: '0.75rem', padding: '4px 8px', backgroundColor: '#3b82f6', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer'}}
                      title="Clique aqui se a câmera tiver pulado o tempo para ajustar o horário."
                    >
                      Ajustar Pulo
                    </button>
                  </span>
                </div>
              </div>
              
              <div className="buttons-container">
                <div className="btn-group">
                  <button className="icon-btn" onClick={() => { if(videoRef.current) videoRef.current.currentTime -= 5; }} title="Voltar 5s">
                    <SkipBack size={20} />
                  </button>
                  <button className="play-pause-btn" onClick={togglePlay}>
                    {isPlaying ? (
                      <><Pause size={20} /> Pausar</>
                    ) : (
                      <><Play size={20} /> Reproduzir</>
                    )}
                  </button>
                  <button className="icon-btn" onClick={() => { if(videoRef.current) videoRef.current.currentTime += 5; }} title="Avançar 5s">
                    <SkipForward size={20} />
                  </button>
                  <select className="speed-select" value={playbackRate} onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}>
                    <option value={0.5}>0.5x Velocidade</option>
                    <option value={1}>1.0x Velocidade</option>
                    <option value={1.5}>1.5x Velocidade</option>
                    <option value={2}>2.0x Velocidade</option>
                    <option value={4}>4.0x Velocidade</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="sidebar">
        <div className="direction-picker" style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>Sentido / Direção da Via</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => setDirection("1")}
              style={{ flex: 1, padding: '10px', backgroundColor: direction === "1" ? '#3b82f6' : '#1e293b', border: '1px solid #334155', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.5rem' }}
            >
              →
            </button>
            <button 
              onClick={() => setDirection("2")}
              style={{ flex: 1, padding: '10px', backgroundColor: direction === "2" ? '#3b82f6' : '#1e293b', border: '1px solid #334155', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.5rem' }}
            >
              ←
            </button>
          </div>
        </div>

        <div className="datetime-picker">
          <label>Data/Hora Real de Início do Vídeo</label>
          <input 
            type="datetime-local" 
            step="1"
            defaultValue={startTime} 
            onChange={e => setStartTime(e.target.value)}
          />
        </div>

        <div className="datetime-picker" style={{ marginTop: '10px' }}>
          <label>Nome da Planilha (Exportação)</label>
          <input 
            type="text" 
            value={exportFileName} 
            onChange={e => setExportFileName(e.target.value)}
            placeholder="Ex: eventos_video_01"
          />
        </div>

        <h2>Contagem ({counts.length})</h2>
        <div className="stats-grid">
          {VEHICLE_TYPES.map(v => (
            <div 
              key={v.type} 
              className={`stat-item ${lastAdded === v.type ? 'pulse-anim' : ''}`}
              onClick={() => addVehicle(v.type)}
              style={{cursor: 'pointer'}}
              title="Clique para adicionar ou use a tecla correspondente"
            >
              <div>
                <span className="key-hint">{v.key.toUpperCase()}</span>
                <span>{v.type}</span>
              </div>
              <span className="count">{stats[v.type]}</span>
            </div>
          ))}
        </div>

        <h3 style={{ fontSize: '1rem', marginBottom: '10px', color: '#cbd5e1' }}>Últimos Registros</h3>
        <div className="log-section">
          {counts.slice().reverse().slice(0, 50).map(c => (
            <div key={c.id} className="log-item">
              <span style={{fontSize: '0.85rem'}}>
                <strong style={{color: '#10b981'}}>{c.real_time_str}</strong> - {c.type} <strong style={{color: '#60a5fa'}}>({c.direction === 1 ? "→" : "←"})</strong>
              </span>
              <button className="log-undo" onClick={() => removeSpecificCount(c.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {counts.length === 0 && <span style={{fontSize: '0.8rem', color: '#64748b', textAlign: 'center', marginTop: '10px'}}>Nenhum veículo registrado</span>}
        </div>

        <button className="finish-btn" onClick={handleFinish} disabled={isSubmitting || counts.length === 0}>
          <Save size={20} />
          {isSubmitting ? "Gerando..." : "Finalizar Contagem"}
        </button>
      </div>

      {showSyncModal && (
        <div style={{position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
          <div style={{backgroundColor: '#1e293b', padding: '30px', borderRadius: '12px', width: '400px', border: '1px solid #334155'}}>
            <h3 style={{marginTop: 0, marginBottom: '20px', color: 'white'}}>Ajustar Pulo de Tempo</h3>
            <p style={{fontSize: '0.9rem', color: '#94a3b8', marginBottom: '20px'}}>
              Se a câmera pulou o tempo, pause o vídeo e digite abaixo qual a hora exata que aparece escrita na tela do vídeo agora.
            </p>
            <input 
              type="datetime-local" 
              step="1"
              value={newSyncTime} 
              onChange={e => setNewSyncTime(e.target.value)}
              style={{width: '100%', padding: '10px', marginBottom: '20px', borderRadius: '6px', border: '1px solid #475569', backgroundColor: '#0f172a', color: 'white'}}
            />
            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px'}}>
              <button onClick={() => setShowSyncModal(false)} style={{padding: '8px 16px', backgroundColor: 'transparent', border: '1px solid #475569', color: '#cbd5e1', borderRadius: '6px', cursor: 'pointer'}}>Cancelar</button>
              <button onClick={saveSyncPoint} style={{padding: '8px 16px', backgroundColor: '#10b981', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'}}>Salvar Novo Horário</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
