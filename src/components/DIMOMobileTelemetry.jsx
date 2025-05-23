import React, { useState } from 'react';
import { Key, Car, Send, Copy, CheckCircle, AlertCircle, Loader2, Calendar, Clock } from 'lucide-react';
import DimoLogo from '../assets/Dimo.svg';

const DIMOMobileTelemetry = () => {
  const [activeTab, setActiveTab] = useState('auth');
  const [authData, setAuthData] = useState({
    clientId: '',
    redirectUri: '',
    apiKey: '',
    vehicleTokenId: ''
  });
  const [vehicleJWT, setVehicleJWT] = useState('');
  const [queryType, setQueryType] = useState('signalsLatest'); // 'signals' or 'signalsLatest'
  const [selectedSignals, setSelectedSignals] = useState([]);
  const [signalAggregations, setSignalAggregations] = useState({}); // For signals query
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 16), // 24h ago
    to: new Date().toISOString().slice(0, 16), // now
    interval: '1h'
  });
  const [queryResult, setQueryResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Available aggregation functions
  const floatAggregationOptions = [
    { value: 'AVG', label: 'Average' },
    { value: 'MAX', label: 'Maximum' },
    { value: 'MIN', label: 'Minimum' },
    { value: 'MED', label: 'Median' },
    { value: 'FIRST', label: 'First' },
    { value: 'LAST', label: 'Last' },
    { value: 'RAND', label: 'Random' }
  ];

  const stringAggregationOptions = [
    { value: 'RAND', label: 'Random' },
    { value: 'TOP', label: 'Most Frequent' },
    { value: 'UNIQUE', label: 'Unique Values' }
  ];

  // Mapping of signals to their aggregation type
  const stringAggregationSignals = new Set([
    'dimoAftermarketSSID',
    'dimoAftermarketWPAState',
    'powertrainCombustionEngineEngineOilLevel',
    'powertrainFuelSystemSupportedFuelTypes',
    'powertrainTractionBatteryChargingIsCharging',
    'powertrainType',
    'isIgnitionOn',
    'obdDTCList'
  ]);

  // Available interval options
  const intervalOptions = [
    { value: '1h', label: '1 Hour' },
    { value: '6h', label: '6 Hours' },
    { value: '12h', label: '12 Hours' },
    { value: '24h', label: '1 Day' },
    { value: '168h', label: '1 Week' }
  ];

  // Available signals based on documentation
  const signalCategories = {
    'Location': [
      { name: 'currentLocationLatitude', description: 'Current latitude' },
      { name: 'currentLocationLongitude', description: 'Current longitude' },
      { name: 'currentLocationAltitude', description: 'Current altitude' },
      { name: 'currentLocationApproximateLatitude', description: 'Approximate latitude' },
      { name: 'currentLocationApproximateLongitude', description: 'Approximate longitude' }
    ],
    'Vehicle Status': [
      { name: 'isIgnitionOn', description: 'Ignition status' },
      { name: 'speed', description: 'Vehicle speed (km/hr)' },
      { name: 'powertrainTransmissionTravelledDistance', description: 'Odometer reading' },
      { name: 'powertrainType', description: 'Powertrain type' }
    ],
    'Battery & Fuel': [
      { name: 'powertrainFuelSystemRelativeLevel', description: 'Fuel level (%)' },
      { name: 'powertrainFuelSystemSupportedFuelTypes', description: 'Supported fuel types' },
      { name: 'powertrainRange', description: 'Remaining range (meters)' },
      { name: 'lowVoltageBatteryCurrentVoltage', description: 'Battery voltage' },
      { name: 'powertrainTractionBatteryStateOfChargeCurrent', description: 'EV battery charge (%)' },
      { name: 'powertrainTractionBatteryChargingIsCharging', description: 'Is charging' },
      { name: 'powertrainTractionBatteryChargingChargeLimit', description: 'Charge limit (%)' },
      { name: 'powertrainTractionBatteryCurrentPower', description: 'Battery power flow' },
      { name: 'powertrainTractionBatteryGrossCapacity', description: 'Battery capacity' }
    ],
    'Engine': [
      { name: 'powertrainCombustionEngineSpeed', description: 'Engine RPM' },
      { name: 'powertrainCombustionEngineECT', description: 'Engine coolant temp' },
      { name: 'powertrainCombustionEngineEngineOilLevel', description: 'Engine oil level' },
      { name: 'obdEngineLoad', description: 'Engine load (%)' },
      { name: 'powertrainCombustionEngineTPS', description: 'Throttle position' }
    ],
    'Tire Pressure': [
      { name: 'chassisAxleRow1WheelLeftTirePressure', description: 'Front left tire (kPa)' },
      { name: 'chassisAxleRow1WheelRightTirePressure', description: 'Front right tire (kPa)' },
      { name: 'chassisAxleRow2WheelLeftTirePressure', description: 'Rear left tire (kPa)' },
      { name: 'chassisAxleRow2WheelRightTirePressure', description: 'Rear right tire (kPa)' }
    ],
    'Environment': [
      { name: 'exteriorAirTemperature', description: 'Outside temperature' },
      { name: 'obdBarometricPressure', description: 'Barometric pressure' }
    ],
    'Device/Network': [
      { name: 'dimoAftermarketSSID', description: 'WiFi network name' },
      { name: 'dimoAftermarketWPAState', description: 'WiFi connection state' }
    ],
    'Diagnostics': [
      { name: 'obdDTCList', description: 'Active diagnostic codes' },
      { name: 'obdRunTime', description: 'Engine run time' }
    ]
  };

  const toggleSignal = (signalName) => {
    setSelectedSignals(prev => {
      const newSignals = prev.includes(signalName) 
        ? prev.filter(s => s !== signalName)
        : [...prev, signalName];
      
      // Set default aggregation for new signals in 'signals' mode
      if (!prev.includes(signalName) && queryType === 'signals') {
        const isStringAgg = stringAggregationSignals.has(signalName);
        const defaultAgg = isStringAgg ? 'RAND' : 'AVG';
        setSignalAggregations(prevAgg => ({
          ...prevAgg,
          [signalName]: defaultAgg
        }));
      }
      
      return newSignals;
    });
  };

  const updateSignalAggregation = (signalName, aggregation) => {
    setSignalAggregations(prev => ({
      ...prev,
      [signalName]: aggregation
    }));
  };

  const getAggregationOptions = (signalName) => {
    return stringAggregationSignals.has(signalName) 
      ? stringAggregationOptions 
      : floatAggregationOptions;
  };

  const generateQuery = () => {
    if (selectedSignals.length === 0) return '';
    
    if (queryType === 'signalsLatest') {
      const signalQueries = selectedSignals.map(signal => `
      ${signal} {
        timestamp
        value
      }`).join('');

      return `query {
  signalsLatest(tokenId: ${authData.vehicleTokenId}) {
    lastSeen${signalQueries}
  }
}`;
    } else {
      // signals query with aggregations
      const signalQueries = selectedSignals.map(signal => {
        const agg = signalAggregations[signal] || 'AVG';
        return `    ${signal}(agg: ${agg})`;
      }).join('\n');

      return `query {
  signals(
    tokenId: ${authData.vehicleTokenId},
    interval: "${dateRange.interval}",
    from: "${dateRange.from}:00Z",
    to: "${dateRange.to}:00Z"
  ) {
${signalQueries}
    timestamp
  }
}`;
    }
  };

  const copyToClipboard = () => {
    const query = generateQuery();
    navigator.clipboard.writeText(query);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const executeQuery = async () => {
    if (!vehicleJWT) {
      setError('Please obtain a Vehicle JWT first');
      return;
    }

    if (selectedSignals.length === 0) {
      setError('Please select at least one signal');
      return;
    }

    // Additional validation for signals query
    if (queryType === 'signals') {
      if (!dateRange.from || !dateRange.to) {
        setError('Please specify both start and end dates for historical data');
        return;
      }
      
      if (new Date(dateRange.from) >= new Date(dateRange.to)) {
        setError('Start date must be before end date');
        return;
      }
    }

    setLoading(true);
    setError('');
    
    try {
      // Log for debugging
      console.log('Executing query with JWT:', vehicleJWT.substring(0, 20) + '...');
      console.log('Query type:', queryType);
      console.log('Generated query:', generateQuery());

      const response = await fetch('/api/telemetry/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${vehicleJWT.trim()}` // Trim whitespace
        },
        body: JSON.stringify({
          query: generateQuery()
        })
      });

      const data = await response.json();
      console.log('Response status:', response.status);
      console.log('Response data:', data);
      
      if (!response.ok) {
        throw new Error(data.message || data.errors?.[0]?.message || `Query failed with status ${response.status}`);
      }
      
      setQueryResult(data);
      setActiveTab('results');
    } catch (err) {
      console.error('Query execution error:', err);
      
      // Check if it's a CORS error
      if (err.message === 'Failed to fetch') {
        setError('CORS Error: Unable to connect to DIMO API directly from browser. You may need to use a proxy server or the official DIMO Telemetry Playground.');
      } else {
        setError(`Error: ${err.message}`);
      }
      
      // Still switch to results tab to show the error
      setActiveTab('results');
    } finally {
      setLoading(false);
    }
  };

  const getVehicleJWT = async () => {
    if (!authData.clientId || !authData.redirectUri || !authData.apiKey || !authData.vehicleTokenId) {
      setError('Please fill in all authentication fields');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      console.log('Generating Vehicle JWT via backend...');
      
      const response = await fetch('/api/auth/vehicle-jwt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: authData.clientId,
          redirect_uri: authData.redirectUri,
          api_key: authData.apiKey,
          vehicle_token_id: authData.vehicleTokenId
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || `Authentication failed with status ${response.status}`);
      }
      
      console.log('✅ Vehicle JWT received successfully');
      setVehicleJWT(data.vehicle_jwt);
      setError(''); // Clear any previous errors
      
    } catch (err) {
      console.error('Authentication error:', err);
      
      if (err.message === 'Failed to fetch') {
        setError('Backend server not running. Please start the Python backend server with: python backend/main.py');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="px-4 sm:px-6 py-4 pt-safe-top">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 flex items-center justify-center">
              <img src={DimoLogo} alt="DIMO" className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">PocketTelemetry</h1>
              <p className="text-gray-400 text-sm">DIMO Telemetry API Explorer</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="flex">
          <button
            onClick={() => setActiveTab('auth')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-all duration-200 ${
              activeTab === 'auth' 
                ? 'border-b-2 text-white bg-gray-700/50' 
                : 'text-gray-300 hover:text-white hover:bg-gray-700/30'
            }`}
            style={{
              borderBottomColor: activeTab === 'auth' ? '#70BCFF' : 'transparent'
            }}
          >
            <Key className="w-4 h-4 inline mr-2" />
            <span className="hidden xs:inline">Authentication</span>
            <span className="xs:hidden">Auth</span>
          </button>
          <button
            onClick={() => setActiveTab('query')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-all duration-200 ${
              activeTab === 'query' 
                ? 'border-b-2 text-white bg-gray-700/50' 
                : 'text-gray-300 hover:text-white hover:bg-gray-700/30'
            }`}
            style={{
              borderBottomColor: activeTab === 'query' ? '#70BCFF' : 'transparent'
            }}
          >
            <Car className="w-4 h-4 inline mr-2" />
            <span className="hidden xs:inline">Query Builder</span>
            <span className="xs:hidden">Query</span>
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-all duration-200 ${
              activeTab === 'results' 
                ? 'border-b-2 text-white bg-gray-700/50' 
                : 'text-gray-300 hover:text-white hover:bg-gray-700/30'
            }`}
            style={{
              borderBottomColor: activeTab === 'results' ? '#70BCFF' : 'transparent'
            }}
          >
            <Send className="w-4 h-4 inline mr-2" />
            Results
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 pb-safe-bottom">
        {/* Auth Tab */}
        {activeTab === 'auth' && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg border border-gray-700">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-white mb-6 flex items-center">
                  <Key className="w-5 h-5 mr-2" style={{ color: '#70BCFF' }} />
                  Developer Credentials
                </h2>
                
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Client ID</label>
                    <input
                      type="text"
                      value={authData.clientId}
                      onChange={(e) => setAuthData({...authData, clientId: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white font-mono transition-colors"
                      style={{
                        '--tw-ring-color': '#70BCFF',
                        '--tw-border-opacity': '1'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#70BCFF';
                        e.target.style.boxShadow = `0 0 0 2px rgba(112, 188, 255, 0.5)`;
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '';
                        e.target.style.boxShadow = '';
                      }}
                      placeholder="0x..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Redirect URI</label>
                    <input
                      type="text"
                      value={authData.redirectUri}
                      onChange={(e) => setAuthData({...authData, redirectUri: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white font-mono transition-colors"
                      onFocus={(e) => {
                        e.target.style.borderColor = '#70BCFF';
                        e.target.style.boxShadow = `0 0 0 2px rgba(112, 188, 255, 0.5)`;
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '';
                        e.target.style.boxShadow = '';
                      }}
                      placeholder="https://your-app.com/callback"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">API Key</label>
                    <input
                      type="password"
                      value={authData.apiKey}
                      onChange={(e) => setAuthData({...authData, apiKey: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white font-mono transition-colors"
                      onFocus={(e) => {
                        e.target.style.borderColor = '#70BCFF';
                        e.target.style.boxShadow = `0 0 0 2px rgba(112, 188, 255, 0.5)`;
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '';
                        e.target.style.boxShadow = '';
                      }}
                      placeholder="Your API key"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Vehicle Token ID</label>
                    <input
                      type="text"
                      value={authData.vehicleTokenId}
                      onChange={(e) => setAuthData({...authData, vehicleTokenId: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white font-mono transition-colors"
                      onFocus={(e) => {
                        e.target.style.borderColor = '#70BCFF';
                        e.target.style.boxShadow = `0 0 0 2px rgba(112, 188, 255, 0.5)`;
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '';
                        e.target.style.boxShadow = '';
                      }}
                      placeholder="12345"
                    />
                  </div>
                </div>

                <button
                  onClick={getVehicleJWT}
                  disabled={loading || !authData.clientId || !authData.apiKey || !authData.vehicleTokenId}
                  className="w-full mt-6 text-white py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  style={{
                    background: 'linear-gradient(to right, #70BCFF, #5BA3E6)',
                    ':hover': {
                      background: 'linear-gradient(to right, #5BA3E6, #4A92D6)'
                    }
                  }}
                  onMouseEnter={(e) => {
                    if (!e.target.disabled) {
                      e.target.style.background = 'linear-gradient(to right, #5BA3E6, #4A92D6)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!e.target.disabled) {
                      e.target.style.background = 'linear-gradient(to right, #70BCFF, #5BA3E6)';
                    }
                  }}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 inline animate-spin mr-2" />
                  ) : null}
                  Get Vehicle JWT
                </button>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Vehicle JWT (for testing)</label>
                  <textarea
                    value={vehicleJWT}
                    onChange={(e) => setVehicleJWT(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-xs font-mono text-white transition-colors resize-none"
                    onFocus={(e) => {
                      e.target.style.borderColor = '#70BCFF';
                      e.target.style.boxShadow = `0 0 0 2px rgba(112, 188, 255, 0.5)`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '';
                      e.target.style.boxShadow = '';
                    }}
                    placeholder="Your Vehicle JWT will be generated here. Alternatively, paste your own."
                    rows={4}
                  />
                </div>

                {vehicleJWT && (
                  <div className="mt-3 flex items-center text-sm px-3 py-2 rounded-lg" style={{ color: '#70BCFF', backgroundColor: 'rgba(112, 188, 255, 0.1)', borderColor: 'rgba(112, 188, 255, 0.3)', border: '1px solid' }}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    JWT configured successfully
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 text-sm text-red-400">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
                  <div>{error}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Query Tab */}
        {activeTab === 'query' && (
          <div className="space-y-6">
            {/* Query Type Selector */}
            <div className="bg-gray-800 rounded-lg border border-gray-700">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Query Type</h2>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setQueryType('signalsLatest')}
                    className={`p-4 rounded-lg border transition-all duration-200 ${
                      queryType === 'signalsLatest'
                        ? 'bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-gray-500 shadow-sm'
                        : 'bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-gray-500'
                    }`}
                    style={queryType === 'signalsLatest' ? {
                      backgroundColor: 'rgba(112, 188, 255, 0.1)',
                      borderColor: 'rgba(112, 188, 255, 0.3)'
                    } : {}}
                  >
                    <div className="text-sm font-semibold text-white">signalsLatest</div>
                    <div className="text-xs text-gray-400 mt-1">Current vehicle signals</div>
                  </button>
                  <button
                    onClick={() => setQueryType('signals')}
                    className={`p-4 rounded-lg border transition-all duration-200 ${
                      queryType === 'signals'
                        ? 'bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-gray-500 shadow-sm'
                        : 'bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-gray-500'
                    }`}
                    style={queryType === 'signals' ? {
                      backgroundColor: 'rgba(112, 188, 255, 0.1)',
                      borderColor: 'rgba(112, 188, 255, 0.3)'
                    } : {}}
                  >
                    <div className="text-sm font-semibold text-white">signals</div>
                    <div className="text-xs text-gray-400 mt-1">Historical time series data</div>
                  </button>
                </div>
              </div>
            </div>

            {/* Date Range & Interval (only for signals query) */}
            {queryType === 'signals' && (
              <div className="bg-gray-800 rounded-lg border border-gray-700">
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    Date Range & Interval
                  </h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">From</label>
                      <input
                        type="datetime-local"
                        value={dateRange.from}
                        onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white transition-colors"
                        onFocus={(e) => {
                          e.target.style.borderColor = '#70BCFF';
                          e.target.style.boxShadow = `0 0 0 2px rgba(112, 188, 255, 0.5)`;
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '';
                          e.target.style.boxShadow = '';
                        }}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">To</label>
                      <input
                        type="datetime-local"
                        value={dateRange.to}
                        onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white transition-colors"
                        onFocus={(e) => {
                          e.target.style.borderColor = '#70BCFF';
                          e.target.style.boxShadow = `0 0 0 2px rgba(112, 188, 255, 0.5)`;
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '';
                          e.target.style.boxShadow = '';
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      Interval
                    </label>
                    <select
                      value={dateRange.interval}
                      onChange={(e) => setDateRange(prev => ({ ...prev, interval: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white transition-colors"
                      onFocus={(e) => {
                        e.target.style.borderColor = '#70BCFF';
                        e.target.style.boxShadow = `0 0 0 2px rgba(112, 188, 255, 0.5)`;
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '';
                        e.target.style.boxShadow = '';
                      }}
                    >
                      {intervalOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-800 rounded-lg border border-gray-700">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">Select Signals</h2>
                  {selectedSignals.length > 0 && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(112, 188, 255, 0.1)', color: '#70BCFF' }}>
                      {selectedSignals.length} selected
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400 mb-6">
                  Tap signals to add them to your query
                  {queryType === 'signals' && (
                    <span className="block mt-1" style={{ color: '#70BCFF' }}>
                      Choose aggregation method for each selected signal
                    </span>
                  )}
                </p>

                <div className="space-y-6">
                  {Object.entries(signalCategories).map(([category, signals]) => (
                    <div key={category}>
                      <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center">
                        <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: '#70BCFF' }}></div>
                        {category}
                      </h3>
                      <div className="space-y-2">
                        {signals.map((signal) => (
                          <div key={signal.name}>
                            <button
                              onClick={() => toggleSignal(signal.name)}
                              className={`w-full text-left p-4 rounded-lg border transition-all duration-200 ${
                                selectedSignals.includes(signal.name)
                                  ? 'bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-gray-500 shadow-sm'
                                  : 'bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-gray-500'
                              }`}
                              style={selectedSignals.includes(signal.name) ? {
                                backgroundColor: 'rgba(112, 188, 255, 0.1)',
                                borderColor: 'rgba(112, 188, 255, 0.3)'
                              } : {}}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-white truncate">{signal.name}</div>
                                  <div className="text-xs text-gray-400 mt-1">{signal.description}</div>
                                </div>
                                {selectedSignals.includes(signal.name) && (
                                  <CheckCircle className="w-5 h-5 ml-3 flex-shrink-0" style={{ color: '#70BCFF' }} />
                                )}
                              </div>
                            </button>
                            
                            {/* Aggregation selector for signals query */}
                            {selectedSignals.includes(signal.name) && queryType === 'signals' && (
                              <div className="mt-2 ml-4">
                                <div className="flex items-center justify-between mb-1">
                                  <label className="block text-xs font-medium text-gray-400">
                                    Aggregation Method
                                  </label>
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    stringAggregationSignals.has(signal.name)
                                      ? 'bg-purple-100 text-purple-700'
                                      : 'text-white'
                                  }`}
                                  style={!stringAggregationSignals.has(signal.name) ? {
                                    backgroundColor: 'rgba(112, 188, 255, 0.1)',
                                    color: '#70BCFF'
                                  } : {}}
                                  >
                                    {stringAggregationSignals.has(signal.name) ? 'String' : 'Numeric'}
                                  </span>
                                </div>
                                <select
                                  value={signalAggregations[signal.name] || (stringAggregationSignals.has(signal.name) ? 'RAND' : 'AVG')}
                                  onChange={(e) => updateSignalAggregation(signal.name, e.target.value)}
                                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-xs text-white transition-colors"
                                  onFocus={(e) => {
                                    e.target.style.borderColor = '#70BCFF';
                                    e.target.style.boxShadow = `0 0 0 2px rgba(112, 188, 255, 0.5)`;
                                  }}
                                  onBlur={(e) => {
                                    e.target.style.borderColor = '';
                                    e.target.style.boxShadow = '';
                                  }}
                                >
                                  {getAggregationOptions(signal.name).map(option => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {selectedSignals.length > 0 && (
              <div className="bg-gray-800 rounded-lg border border-gray-700">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Generated Query</h3>
                    <button
                      onClick={copyToClipboard}
                      className={`text-sm flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
                        copied 
                          ? 'bg-opacity-10' 
                          : 'hover:bg-opacity-30'
                      }`}
                      style={{
                        color: copied ? '#70BCFF' : '#70BCFF',
                        backgroundColor: copied ? 'rgba(112, 188, 255, 0.1)' : 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        if (!copied) {
                          e.target.style.backgroundColor = 'rgba(112, 188, 255, 0.2)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!copied) {
                          e.target.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      {copied ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <div className="bg-gray-700 rounded-xl p-4 overflow-x-auto">
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                      {generateQuery()}
                    </pre>
                  </div>
                  
                  <button
                    onClick={executeQuery}
                    disabled={loading || !vehicleJWT}
                    className="w-full mt-6 text-white py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    style={{
                      background: 'linear-gradient(to right, #70BCFF, #5BA3E6)'
                    }}
                    onMouseEnter={(e) => {
                      if (!e.target.disabled) {
                        e.target.style.background = 'linear-gradient(to right, #5BA3E6, #4A92D6)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!e.target.disabled) {
                        e.target.style.background = 'linear-gradient(to right, #70BCFF, #5BA3E6)';
                      }
                    }}
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 inline animate-spin mr-2" />
                    ) : (
                      <Send className="w-5 h-5 inline mr-2" />
                    )}
                    Execute Query
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && (
          <div className="space-y-6">
            {error && (
              <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 text-sm text-red-400">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
                  <div>{error}</div>
                </div>
              </div>
            )}
            
            {queryResult ? (
              <div className="space-y-6">
                <div className="bg-gray-800 rounded-lg border border-gray-700">
                  <div className="p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Query Results</h2>
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-300 mb-3">Raw Response:</h3>
                      <div className="bg-gray-700 rounded-xl p-4 overflow-x-auto">
                        <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                          {JSON.stringify(queryResult, null, 2)}
                        </pre>
                      </div>
                    </div>
                    
                    {/* Display parsed signal values if available */}
                    {queryResult.data && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-300 mb-4">Parsed Signal Values:</h3>
                        
                        {/* Handle signalsLatest response format */}
                        {queryResult.data.signalsLatest && (
                          <div className="grid gap-3">
                            {Object.entries(queryResult.data.signalsLatest).map(([key, value]) => {
                              if (key === 'lastSeen' || !value) return null;
                              return (
                                <div key={key} className="rounded-xl p-4" style={{ backgroundColor: 'rgba(112, 188, 255, 0.1)', borderColor: 'rgba(112, 188, 255, 0.3)', border: '1px solid' }}>
                                  <div className="font-semibold text-sm mb-2" style={{ color: '#70BCFF' }}>{key}</div>
                                  {value.value !== undefined && (
                                    <div className="text-lg font-bold text-white mb-1">
                                      {value.value}
                                    </div>
                                  )}
                                  {value.timestamp && (
                                    <div className="text-xs text-gray-400">
                                      {new Date(value.timestamp).toLocaleString()}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        
                        {/* Handle signals response format (time series data) */}
                        {queryResult.data.signals && (
                          <div className="space-y-4">
                            {queryResult.data.signals.length > 0 ? (
                              <>
                                <div className="text-sm text-gray-400 mb-2">
                                  Found {queryResult.data.signals.length} data points
                                </div>
                                <div className="grid gap-3 max-h-96 overflow-y-auto">
                                  {queryResult.data.signals.slice(0, 10).map((dataPoint, index) => (
                                    <div key={index} className="rounded-xl p-4" style={{ backgroundColor: 'rgba(112, 188, 255, 0.1)', borderColor: 'rgba(112, 188, 255, 0.3)', border: '1px solid' }}>
                                      <div className="text-xs font-semibold mb-2" style={{ color: '#70BCFF' }}>
                                        Data Point {index + 1}
                                      </div>
                                      {Object.entries(dataPoint).map(([signalName, value]) => (
                                        <div key={signalName} className="mb-2">
                                          <span className="text-sm font-medium text-white">{signalName}:</span>
                                          <span className="ml-2 text-sm text-gray-300">
                                            {signalName === 'timestamp' 
                                              ? new Date(value).toLocaleString()
                                              : value?.toString() || 'null'
                                            }
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  ))}
                                </div>
                                {queryResult.data.signals.length > 10 && (
                                  <div className="text-xs text-gray-500 text-center">
                                    Showing first 10 of {queryResult.data.signals.length} data points
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="text-sm text-gray-400 p-4 bg-gray-700 rounded-xl">
                                No data found for the selected time range and signals
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg border border-gray-700">
                <div className="p-12 text-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(112, 188, 255, 0.2)' }}>
                    <Car className="w-8 h-8" style={{ color: '#70BCFF' }} />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">No Results Yet</h3>
                  <p className="text-gray-400 text-sm">Execute a query to see telemetry data</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DIMOMobileTelemetry;