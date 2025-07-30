import React, { useState } from 'react';
import './BulkQRGenerator.css';
import { getDatabase, ref, get } from 'firebase/database';
import QRCode from 'qrcode';
import logo from './assets/logo.jpeg';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const BulkQRGenerator = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleGenerateAndDownload = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      // Fetch all users from Firebase
      const db = getDatabase();
      const usersRef = ref(db, 'users');
      const snap = await get(usersRef);
      if (!snap.exists()) {
        setError('No users found.');
        setLoading(false);
        return;
      }
      const users = snap.val();
      const userArr = Object.entries(users)
        .filter(([id, user]) => user.status === 1 || user.status === '1')
        .map(([id, user]) => ({ id, ...user }));
      if (userArr.length === 0) {
        setError('No active users found.');
        setLoading(false);
        return;
      }

      // Load logo image and ensure it's fully loaded
      // Convert imported logo to base64 data URL and load as Image
      const getBase64Logo = (url) => {
        return fetch(url)
          .then((res) => res.blob())
          .then(
            (blob) =>
              new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              })
          );
      };

      const loadLogo = async () => {
        const base64Url = await getBase64Logo(logo);
        return new Promise((resolve, reject) => {
          const img = new window.Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = base64Url;
        });
      };

      const logoImg = await loadLogo();
      const logoSizeRatio = 0.22; // Logo covers ~22% of QR width
      const qrSize = 400;
      const zip = new JSZip();
      for (const user of userArr) {
        const qrData = user.id;
        const name = user.name || user.id;
        const fontSize = 36;
        const padding = 24;
        const nameHeight = fontSize + padding;
        const canvas = document.createElement('canvas');
        canvas.width = qrSize;
        canvas.height = qrSize + nameHeight;
        const ctx = canvas.getContext('2d');

        // Fill background white
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw QR code at (0,0) in a temp canvas, then draw onto main canvas
        const qrCanvas = document.createElement('canvas');
        qrCanvas.width = qrSize;
        qrCanvas.height = qrSize;
        await QRCode.toCanvas(qrCanvas, qrData, { width: qrSize });
        ctx.drawImage(qrCanvas, 0, 0);

        // Calculate logo size and position to maintain aspect ratio
        const maxLogoSize = qrSize * logoSizeRatio;
        const logoAspect = logoImg.naturalWidth / logoImg.naturalHeight;
        let drawW, drawH;
        if (logoAspect >= 1) {
          drawW = maxLogoSize;
          drawH = maxLogoSize / logoAspect;
        } else {
          drawH = maxLogoSize;
          drawW = maxLogoSize * logoAspect;
        }
        const logoX = (qrSize - drawW) / 2;
        const logoY = (qrSize - drawH) / 2;
        const radius = Math.min(drawW, drawH) * 0.18;
        // Draw white rounded rect behind logo for visibility
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(logoX + radius, logoY);
        ctx.lineTo(logoX + drawW - radius, logoY);
        ctx.quadraticCurveTo(logoX + drawW, logoY, logoX + drawW, logoY + radius);
        ctx.lineTo(logoX + drawW, logoY + drawH - radius);
        ctx.quadraticCurveTo(logoX + drawW, logoY + drawH, logoX + drawW - radius, logoY + drawH);
        ctx.lineTo(logoX + radius, logoY + drawH);
        ctx.quadraticCurveTo(logoX, logoY + drawH, logoX, logoY + drawH - radius);
        ctx.lineTo(logoX, logoY + radius);
        ctx.quadraticCurveTo(logoX, logoY, logoX + radius, logoY);
        ctx.closePath();
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.95;
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.restore();
        // Draw logo in center, maintaining aspect ratio
        ctx.drawImage(logoImg, logoX, logoY, drawW, drawH);

        // Draw user name below QR code
        ctx.save();
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#222';
        // White background for text
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, qrSize, qrSize, nameHeight);
        ctx.fillStyle = '#222';
        ctx.fillText(name, qrSize / 2, qrSize + padding / 2);
        ctx.restore();

        // Export as PNG data URL
        const pngDataUrl = canvas.toDataURL('image/png');
        const base64 = pngDataUrl.split(',')[1];
        zip.file(`${name}.png`, base64, { base64: true });
      }
      // Generate zip and trigger download
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, 'bulk-qr-codes.zip');
      setSuccess(`Successfully generated and downloaded ${userArr.length} QR codes.`);
    } catch (err) {
      setError('Failed to generate QR codes. ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bulk-qr-generator-container">
      <h2>Bulk QR Generator</h2>
      <p>Click the button below to generate QR codes for all users and download as a zip file.</p>
      <button onClick={handleGenerateAndDownload} disabled={loading} style={{ padding: '12px 28px', fontSize: 18, borderRadius: 8, background: '#1976d2', color: '#fff', border: 'none', cursor: 'pointer', marginTop: 16 }}>
        {loading ? 'Generating...' : 'Generate & Download All QR Codes'}
      </button>
      {error && <div style={{ color: 'red', marginTop: 18 }}>{error}</div>}
      {success && <div style={{ color: 'green', marginTop: 18 }}>{success}</div>}
    </div>
  );
};

export default BulkQRGenerator;
