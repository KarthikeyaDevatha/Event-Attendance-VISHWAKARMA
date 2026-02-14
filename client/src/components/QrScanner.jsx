import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function QrScanner({ onScan, scanning }) {
  const scannerRef = useRef(null);
  const html5QrRef = useRef(null);
  const [mirror, setMirror] = useState(false);
  const [cameraMode, setCameraMode] = useState('environment');
  const [error, setError] = useState(null);

  const onScanRef = useRef(onScan);
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  useEffect(() => {
    if (!scanning) return;

    const currentScannerId = 'qr-reader'; 
    const html5Qr = new Html5Qrcode(currentScannerId);
    html5QrRef.current = html5Qr;

    const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 250 }, 
        aspectRatio: 1.0,
        disableFlip: false // Allow library to handle standard flipping
    };
    
    // Attempt to handle mirroring via config if supported or just rely on CSS for view
    html5Qr.start({ facingMode: cameraMode }, config, (decodedText) => {
        onScanRef.current(decodedText);
    }, (errorMessage) => {
        // parsing error
    }).catch(err => {
        console.error("Error starting scanner", err);
        setError("Camera error: " + err);
    });

    return () => {
        if (html5Qr.isScanning) {
            html5Qr.stop().then(() => {
                html5Qr.clear();
            }).catch(err => console.error("Failed to stop scanner", err));
        }
    };
  }, [scanning, cameraMode]);

  const toggleMirror = () => setMirror(!mirror);
  const toggleCamera = () => setCameraMode(prev => prev === 'environment' ? 'user' : 'environment');

  return (
    <div className="qr-scanner-container">
      {error && <div className="error-msg">{error}</div>}
      
      <div 
        id="qr-reader" 
        className="qr-reader" 
        style={{
            width: '100%', 
            transform: mirror ? 'scaleX(-1)' : 'none' 
        }} 
      />
      
      <div className="scanner-controls" style={{marginTop: '10px', display: 'flex', gap: '10px', justifyContent: 'center'}}>
        <button type="button" onClick={toggleMirror} className="btn btn-sm btn-secondary">
          {mirror ? "Un-Mirror View" : "Mirror View"}
        </button>
        <button type="button" onClick={toggleCamera} className="btn btn-sm btn-secondary">
          Switch Camera ({cameraMode})
        </button>
      </div>

      <div style={{fontSize: '0.8rem', color: '#888', marginTop: '10px'}}>
        Scanning Status: {scanning ? "Active" : "Inactive"} <br/>
        {error ? "Error: " + error : "Ensure QR code is not backwards."}
      </div>
      {scanning && !error && (
        <div className="scanner-hint">Point camera at student's QR code</div>
      )}
    </div>
  );
}
