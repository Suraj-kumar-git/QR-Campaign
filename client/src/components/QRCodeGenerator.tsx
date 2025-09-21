import { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { Loader2 } from 'lucide-react';

interface QRCodeGeneratorProps {
  value: string;
  size?: number;
  className?: string;
  alt?: string;
  iconPath?: string;
  borderStyle?: 'thick' | 'none';
}

export function QRCodeGenerator({ value, size = 256, className = "", alt = "QR Code", iconPath, borderStyle = 'none' }: QRCodeGeneratorProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const generateQRCode = async () => {
      try {
        setIsLoading(true);
        setError('');
        
        // Generate base QR code
        const baseQrUrl = await QRCode.toDataURL(value, {
          width: size,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        
        // If no icon is provided, use the base QR code
        if (!iconPath) {
          setQrCodeUrl(baseQrUrl);
          return;
        }
        
        // Create canvas for compositing QR code with icon
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          setQrCodeUrl(baseQrUrl);
          return;
        }
        
        canvas.width = size;
        canvas.height = size;
        
        // Load and draw base QR code
        const qrImage = new Image();
        qrImage.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
          qrImage.onload = resolve;
          qrImage.onerror = reject;
          qrImage.src = baseQrUrl;
        });
        
        ctx.drawImage(qrImage, 0, 0, size, size);
        
        // Load and draw icon overlay
        const iconImage = new Image();
        iconImage.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
          iconImage.onload = resolve;
          iconImage.onerror = () => {
            // If icon fails to load, just use base QR code
            resolve(undefined);
          };
          iconImage.src = iconPath;
        });
        
        if (iconImage.complete && iconImage.naturalWidth > 0) {
          // Calculate icon size (about 20% of QR code size)
          const iconSize = Math.floor(size * 0.2);
          const iconX = (size - iconSize) / 2;
          const iconY = (size - iconSize) / 2;
          
          // Draw white background circle for icon
          const padding = 4;
          const circleRadius = (iconSize + padding) / 2;
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, circleRadius, 0, 2 * Math.PI);
          ctx.fill();
          
          // Draw icon
          ctx.drawImage(iconImage, iconX, iconY, iconSize, iconSize);
        }
        
        // Convert canvas to data URL
        const finalUrl = canvas.toDataURL('image/png');
        setQrCodeUrl(finalUrl);
        
      } catch (err) {
        console.error('QR Code generation error:', err);
        setError('Failed to generate QR code');
      } finally {
        setIsLoading(false);
      }
    };

    if (value) {
      generateQRCode();
    }
  }, [value, size, iconPath]);

  if (isLoading) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`}
        style={{ width: size, height: size }}
      >
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg text-red-500 text-sm ${className}`}
        style={{ width: size, height: size }}
      >
        {error}
      </div>
    );
  }

  const qrCodeElement = (
    <img 
      src={qrCodeUrl} 
      alt={alt}
      className="rounded-lg max-w-none"
      style={{ width: size, height: 'auto', aspectRatio: '1 / 1' }}
    />
  );
  
  // Apply border styling if specified
  if (borderStyle === 'thick') {
    return (
      <div 
        className={`border-4 border-black dark:border-white rounded-lg p-2 bg-white dark:bg-gray-800 ${className}`}
        style={{ width: size + 16, height: size + 16 }}
      >
        {qrCodeElement}
      </div>
    );
  }
  
  return (
    <div className={className}>
      {qrCodeElement}
    </div>
  );
}