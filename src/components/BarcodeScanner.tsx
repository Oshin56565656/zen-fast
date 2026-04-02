import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BarcodeScannerProps {
  onScan: (barcode: string, productInfo?: any) => void;
  onClose: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const [isScanning, setIsScanning] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
        ]
      },
      /* verbose= */ false
    );

    scanner.render(onScanSuccess, onScanFailure);
    scannerRef.current = scanner;

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
      }
    };
  }, []);

  const fetchProductInfo = async (barcode: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const data = await response.json();
      
      if (data.status === 1) {
        return data.product;
      }
      return null;
    } catch (err) {
      console.error("Failed to fetch product info", err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  async function onScanSuccess(decodedText: string) {
    if (!isScanning) return;
    setIsScanning(false);
    
    if (scannerRef.current) {
      await scannerRef.current.clear();
    }

    const product = await fetchProductInfo(decodedText);
    onScan(decodedText, product);
  }

  function onScanFailure(error: any) {
    // Silently ignore scan failures (they happen constantly while searching)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card w-full max-w-md rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
      >
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div className="flex items-center space-x-2">
            <Camera className="text-primary" size={20} />
            <h3 className="font-bold text-white">Scan Barcode</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/40"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div id="reader" className="overflow-hidden rounded-2xl border border-white/10 bg-black"></div>
          
          <div className="text-center space-y-2">
            <p className="text-sm text-white/60">
              Point your camera at a barcode to automatically log your meal.
            </p>
            {isLoading && (
              <div className="flex items-center justify-center space-x-2 text-primary">
                <Loader2 className="animate-spin" size={16} />
                <span className="text-xs font-bold uppercase tracking-widest">Fetching Product Info...</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default BarcodeScanner;
