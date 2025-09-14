import React, { useState } from 'react';
import './BulkQRGenerator.css';
import './NoEventSelected.css';
import { useTenant } from './TenantContext';
import { createTenantDataService } from './services/TenantDataService';
import QRCode from 'qrcode';
import logo from './assets/logo.jpeg';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const BulkQRGenerator = () => {
  const { tenantId, selectedEventId } = useTenant();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [migrationNeeded, setMigrationNeeded] = useState(false);

  const handleGenerateAndDownload = async () => {
    if (!tenantId || !selectedEventId) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      // Fetch all users from tenant service for the selected event
      const tenantService = createTenantDataService(tenantId);
      const users = await tenantService.getUsers(selectedEventId);
      
      if (users.length === 0) {
        setError('No users found for the selected event.');
        setLoading(false);
        return;
      }
      
      setMigrationNeeded(false);
      const userArr = users; // users are already filtered and formatted
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
        const maxFontSize = 36;
        const minFontSize = 16;
        const padding = 24;
        let fontSize = maxFontSize;
        // Create a temp canvas for measuring text width
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.font = `bold ${fontSize}px Arial, sans-serif`;
        let textWidth = tempCtx.measureText(name).width;
        // Reduce font size until text fits within (qrSize - 32px) or minFontSize
        while (textWidth > qrSize - 32 && fontSize > minFontSize) {
          fontSize -= 1;
          tempCtx.font = `bold ${fontSize}px Arial, sans-serif`;
          textWidth = tempCtx.measureText(name).width;
        }
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
      console.error('Error generating QR codes:', err);
      if (err.message?.includes('Failed to fetch users')) {
        setMigrationNeeded(true);
        setError('No tenant data found. Please migrate your data first.');
      } else {
        setError('Failed to generate QR codes. ' + (err.message || ''));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMigrateData = async () => {
    if (!tenantId) return;
    
    try {
      setLoading(true);
      setError('');
      const tenantService = createTenantDataService(tenantId);
      await tenantService.migrateExistingData();
      
      setMigrationNeeded(false);
      setSuccess('Data migrated successfully! You can now generate QR codes.');
    } catch (error) {
      console.error('Error migrating data:', error);
      setError('Failed to migrate data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedEventId) {
    return (
      <div className="bulk-qr-generator-container">
        <h2>Bulk QR Generator</h2>
        <div className="no-event-selected">
          <div className="no-event-icon">
            <i className="fas fa-calendar-times"></i>
          </div>
          <div className="no-event-content">
            <h3>No Event Selected</h3>
            <p>Please select an event from the header dropdown to generate QR codes for users.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bulk-qr-generator-container">
      <h2>Bulk QR Generator</h2>
      
      {migrationNeeded && (
        <div className="migration-notice">
          <div className="migration-icon">
            <i className="fas fa-database"></i>
          </div>
          <div className="migration-content">
            <h3>Data Migration Required</h3>
            <p>Your existing users data needs to be migrated to generate QR codes. This is a one-time process.</p>
            <button onClick={handleMigrateData} className="migrate-btn" disabled={loading}>
              {loading ? (
                <>
                  <div className="spinner-small"></div>
                  Migrating...
                </>
              ) : (
                <>
                  <i className="fas fa-arrow-right"></i>
                  Migrate Data Now
                </>
              )}
            </button>
          </div>
        </div>
      )}
      
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
