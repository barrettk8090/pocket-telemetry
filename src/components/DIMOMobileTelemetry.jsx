import React, { useState } from 'react';
import { Key, Car, Send, Copy, CheckCircle, AlertCircle, Loader2, Calendar, Clock } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white">
        <div className="px-4 sm:px-6 py-6 pt-safe-top">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">PocketTelemetry</h1>
              <p className="text-blue-100 text-sm mt-0.5">DIMO Telemetry Explorer</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="flex">
          <button
            onClick={() => setActiveTab('auth')}
            className={`flex-1 py-4 px-3 text-sm font-semibold transition-all duration-200 ${
              activeTab === 'auth' 
                ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <Key className="w-4 h-4 inline mr-2" />
            <span className="hidden xs:inline">Authentication</span>
            <span className="xs:hidden">Auth</span>
          </button>
          <button
            onClick={() => setActiveTab('query')}
            className={`flex-1 py-4 px-3 text-sm font-semibold transition-all duration-200 ${
              activeTab === 'query' 
                ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <Car className="w-4 h-4 inline mr-2" />
            <span className="hidden xs:inline">Query Builder</span>
            <span className="xs:hidden">Query</span>
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`flex-1 py-4 px-3 text-sm font-semibold transition-all duration-200 ${
              activeTab === 'results' 
                ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Developer Credentials</h2>
                
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Client ID</label>
                    <input
                      type="text"
                      value={authData.clientId}
                      onChange={(e) => setAuthData({...authData, clientId: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 focus:bg-white"
                      placeholder="0x..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Redirect URI</label>
                    <input
                      type="text"
                      value={authData.redirectUri}
                      onChange={(e) => setAuthData({...authData, redirectUri: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 focus:bg-white"
                      placeholder="https://your-app.com/callback"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                    <input
                      type="password"
                      value={authData.apiKey}
                      onChange={(e) => setAuthData({...authData, apiKey: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 focus:bg-white"
                      placeholder="Your API key"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Token ID</label>
                    <input
                      type="text"
                      value={authData.vehicleTokenId}
                      onChange={(e) => setAuthData({...authData, vehicleTokenId: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 focus:bg-white"
                      placeholder="12345"
                    />
                  </div>
                </div>

                <button
                  onClick={getVehicleJWT}
                  disabled={loading || !authData.clientId || !authData.apiKey || !authData.vehicleTokenId}
                  className="w-full mt-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 inline animate-spin mr-2" />
                  ) : null}
                  Get Vehicle JWT
                </button>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle JWT (for testing)</label>
                  <textarea
                    value={vehicleJWT}
                    onChange={(e) => setVehicleJWT(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 focus:bg-white resize-none"
                    placeholder="Paste your Vehicle JWT here"
                    rows={4}
                  />
                </div>

                {vehicleJWT && (
                  <div className="mt-3 flex items-center text-green-600 text-sm bg-green-50 px-3 py-2 rounded-lg">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    JWT configured successfully
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Query Type</h2>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setQueryType('signalsLatest')}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                      queryType === 'signalsLatest'
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-sm'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-sm font-semibold text-gray-900">Latest Signals</div>
                    <div className="text-xs text-gray-600 mt-1">Current values only</div>
                  </button>
                  <button
                    onClick={() => setQueryType('signals')}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                      queryType === 'signals'
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-sm'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-sm font-semibold text-gray-900">Historical Signals</div>
                    <div className="text-xs text-gray-600 mt-1">Time series data</div>
                  </button>
                </div>
              </div>
            </div>

            {/* Date Range & Interval (only for signals query) */}
            {queryType === 'signals' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    Date Range & Interval
                  </h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
                      <input
                        type="datetime-local"
                        value={dateRange.from}
                        onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 focus:bg-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
                      <input
                        type="datetime-local"
                        value={dateRange.to}
                        onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      Interval
                    </label>
                    <select
                      value={dateRange.interval}
                      onChange={(e) => setDateRange(prev => ({ ...prev, interval: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 focus:bg-white"
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

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Select Signals</h2>
                  {selectedSignals.length > 0 && (
                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                      {selectedSignals.length} selected
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-6">
                  Tap signals to add them to your query
                  {queryType === 'signals' && (
                    <span className="block mt-1 text-blue-600">
                      Choose aggregation method for each selected signal
                    </span>
                  )}
                </p>

                <div className="space-y-6">
                  {Object.entries(signalCategories).map(([category, signals]) => (
                    <div key={category}>
                      <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                        {category}
                      </h3>
                      <div className="space-y-2">
                        {signals.map((signal) => (
                          <div key={signal.name}>
                            <button
                              onClick={() => toggleSignal(signal.name)}
                              className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                                selectedSignals.includes(signal.name)
                                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-sm'
                                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-gray-900 truncate">{signal.name}</div>
                                  <div className="text-xs text-gray-600 mt-1">{signal.description}</div>
                                </div>
                                {selectedSignals.includes(signal.name) && (
                                  <CheckCircle className="w-5 h-5 text-blue-600 ml-3 flex-shrink-0" />
                                )}
                              </div>
                            </button>
                            
                            {/* Aggregation selector for signals query */}
                            {selectedSignals.includes(signal.name) && queryType === 'signals' && (
                              <div className="mt-2 ml-4">
                                <div className="flex items-center justify-between mb-1">
                                  <label className="block text-xs font-medium text-gray-600">
                                    Aggregation Method
                                  </label>
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    stringAggregationSignals.has(signal.name)
                                      ? 'bg-purple-100 text-purple-700'
                                      : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    {stringAggregationSignals.has(signal.name) ? 'String' : 'Numeric'}
                                  </span>
                                </div>
                                <select
                                  value={signalAggregations[signal.name] || (stringAggregationSignals.has(signal.name) ? 'RAND' : 'AVG')}
                                  onChange={(e) => updateSignalAggregation(signal.name, e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
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
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Generated Query</h3>
                    <button
                      onClick={copyToClipboard}
                      className={`text-sm flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
                        copied 
                          ? 'text-green-700 bg-green-50' 
                          : 'text-blue-600 hover:bg-blue-50'
                      }`}
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
                  <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto">
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                      {generateQuery()}
                    </pre>
                  </div>
                  
                  <button
                    onClick={executeQuery}
                    disabled={loading || !vehicleJWT}
                    className="w-full mt-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
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
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
                  <div>{error}</div>
                </div>
              </div>
            )}
            
            {queryResult ? (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                  <div className="p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Query Results</h2>
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Raw Response:</h3>
                      <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto">
                        <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                          {JSON.stringify(queryResult, null, 2)}
                        </pre>
                      </div>
                    </div>
                    
                    {/* Display parsed signal values if available */}
                    {queryResult.data && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Parsed Signal Values:</h3>
                        
                        {/* Handle signalsLatest response format */}
                        {queryResult.data.signalsLatest && (
                          <div className="grid gap-3">
                            {Object.entries(queryResult.data.signalsLatest).map(([key, value]) => {
                              if (key === 'lastSeen' || !value) return null;
                              return (
                                <div key={key} className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                                  <div className="font-semibold text-sm text-gray-900 mb-2">{key}</div>
                                  {value.value !== undefined && (
                                    <div className="text-lg font-bold text-blue-700 mb-1">
                                      {value.value}
                                    </div>
                                  )}
                                  {value.timestamp && (
                                    <div className="text-xs text-gray-600">
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
                                <div className="text-sm text-gray-600 mb-2">
                                  Found {queryResult.data.signals.length} data points
                                </div>
                                <div className="grid gap-3 max-h-96 overflow-y-auto">
                                  {queryResult.data.signals.slice(0, 10).map((dataPoint, index) => (
                                    <div key={index} className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                                      <div className="text-xs font-semibold text-gray-700 mb-2">
                                        Data Point {index + 1}
                                      </div>
                                      {Object.entries(dataPoint).map(([signalName, value]) => (
                                        <div key={signalName} className="mb-2">
                                          <span className="text-sm font-medium text-gray-900">{signalName}:</span>
                                          <span className="ml-2 text-sm text-gray-700">
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
                              <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-xl">
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
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Car className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Results Yet</h3>
                  <p className="text-gray-600 text-sm">Execute a query to see telemetry data</p>
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