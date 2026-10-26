import React, { useEffect, useState } from 'react';
import BLEScanner, { DiscoveredDevice } from '../lib/ble-scanner';

const BLEScanDemo: React.FC = () => {
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const scanner = new BLEScanner();

  const handleStartScan = async () => {
    setIsScanning(true);
    setDevices([]);
    try {
      await scanner.startScan();
      // Stop after 10 seconds automatically
      setTimeout(async () => {
        await scanner.stopScan();
        setIsScanning(false);
        console.log('Discovered EchoSOS devices:', scanner.getFoundDevices());
        setDevices(scanner.getFoundDevices());
      }, 10000);
    } catch (error) {
      console.error('BLE Scan error:', error);
      setIsScanning(false);
    }
  };

  const handleStopScan = async () => {
    await scanner.stopScan();
    setIsScanning(false);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>EchoSOS BLE Scanner</h2>
      <div>
        <button
          onClick={handleStartScan}
          disabled={isScanning}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            background: isScanning ? '#f5f5f5' : '#3b82f6',
            color: isScanning ? '#6b7280' : 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isScanning ? 'not-allowed' : 'pointer',
          }}
        >
          {isScanning ? 'Scanning...' : 'Scan for EchoSOS Devices'}
        </button>
        <button
          onClick={handleStopScan}
          disabled={!isScanning}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            marginLeft: '10px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Stop
        </button>
      </div>

      {isScanning && <p>Scanning for BLE devices advertising EchoSOS patterns...</p>}

      <div style={{ marginTop: '20px', maxHeight: '300px', overflowY: 'auto' }}>
        {devices.length === 0 && !isScanning && (
          <p>No EchoSOS devices found. Make sure the advertiser is broadcasting with pattern:</p>
          <ul>
            <li><code>EchoSOS-r-...</code> - Registration mode</li>
            <li><code>EchoSOS-e-...</code> - Emergency alert mode</li>
          </ul>
        )}

        {devices.map((device) => (
          <div
            key={device.id}
            style={{
              padding: '10px',
              marginBottom: '10px',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              background: '#f9fafb',
            }}
          >
            <strong>Name:</strong> {device.name || 'Unknown'}<br />
            <strong>ID:</strong> {device.id}<br />
            <strong>RSSI:</strong> {device.rssi} dBm<br />
            <strong>Mode:</strong>
            {device.name?.startsWith('EchoSOS-r-')
              ? 'Registration Mode'
              : device.name?.startsWith('EchoSOS-e-')
              ? 'Emergency Alert Mode'
              : 'Unknown'}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BLEScanDemo;