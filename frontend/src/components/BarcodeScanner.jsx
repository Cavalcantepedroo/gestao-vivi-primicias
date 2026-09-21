import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

/**
 * Componente de leitura de código de barras.
 * Suporta:
 * 1. Leitores físicos (USB/Bluetooth) emulando teclado (escuta global).
 * 2. Webcam via html5-qrcode.
 * 3. Entrada manual como fallback para câmera ruim / sem permissão.
 */
export default function BarcodeScanner({ onScan, placeholder = "Aguardando leitura de código..." }) {
  const [cameraAtiva, setCameraAtiva] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [manualCode, setManualCode] = useState('');
  const scannerRef = useRef(null);

  const handleBarcode = (value) => {
    const normalized = String(value || '').trim();
    if (!normalized) return;
    onScan(normalized);
  };

  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e) => {
      if (e.target && e.target.tagName === 'INPUT' && e.target.type !== 'text') return;
      if (e.target && e.target.tagName === 'TEXTAREA') return;
      if (e.target?.id === 'codigo-barras-entrada' && e.key === 'Enter') return;

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 80) {
        buffer = '';
      }

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          e.preventDefault();
          handleBarcode(buffer);
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }

      lastKeyTime = currentTime;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onScan]);

  useEffect(() => {
    if (!cameraAtiva) {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Seu navegador não suporta câmera para leitura de código de barras.');
      setCameraAtiva(false);
      return;
    }

    setCameraError('');
    scannerRef.current = new Html5QrcodeScanner(
      'reader-webcam',
      {
        fps: 10,
        qrbox: { width: 280, height: 120 },
        aspectRatio: 1.5,
        disableFlip: false,
      },
      false
    );

    scannerRef.current.render(
      (decodedText) => {
        if (scannerRef.current) {
          scannerRef.current.pause(true);
        }
        handleBarcode(decodedText);
        setTimeout(() => {
          if (scannerRef.current) scannerRef.current.resume();
        }, 1500);
      },
      (error) => {
        // Ignora erros transientes de frame sem código. O erro real de câmera é tratado em `cameraError`.
      }
    ).catch((err) => {
      setCameraError(err?.message || 'Não foi possível iniciar a câmera. Verifique permissão e qualidade da câmera.');
      setCameraAtiva(false);
    });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, [cameraAtiva]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleBarcode(manualCode);
    setManualCode('');
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <form onSubmit={handleManualSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="codigo-barras-entrada" className="block text-sm font-medium text-gray-700 mb-2">
              Código de barras
            </label>
            <div className="relative">
              <input
                id="codigo-barras-entrada"
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleManualSubmit(e);
                }}
                placeholder={placeholder}
                className="w-full border border-gray-300 rounded-md px-4 py-3.5 pr-12 text-base text-gray-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                autoFocus
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-600" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
                  <rect x="7" y="7" width="10" height="10" rx="1" />
                </svg>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCameraAtiva(!cameraAtiva)}
            className={`inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-md transition font-medium whitespace-nowrap ${cameraAtiva ? 'bg-gray-700 hover:bg-gray-800' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M14.5 4h-5L8 6H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3l-1.5-2Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {cameraAtiva ? 'Desligar Webcam' : 'Usar Webcam'}
          </button>
        </form>

        <p className="mt-2 text-xs text-gray-500">O leitor físico envia o código automaticamente ao campo acima.</p>
      </div>

      {cameraError && (
        <div className="p-3 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm">
          {cameraError}
        </div>
      )}

      {cameraAtiva && (
        <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-sm">
          <div id="reader-webcam" className="w-full max-w-md mx-auto overflow-hidden rounded-md"></div>
        </div>
      )}
    </div>
  );
}
