import { useEffect, useState } from 'react';

const typeStyles = {
  info: 'text-blue-400',
  warn: 'text-yellow-400',
  error: 'text-red-400',
};

export default function LogBox() {
  const [logs, setLogs] = useState([]);

  // useEffect(() => {
  //   const eventSource = new EventSource('/api/logs');

  //   eventSource.onmessage = (event) => {
  //     try {
  //       const { message, type } = JSON.parse(event.data);
  //       setLogs(prev => [...prev.slice(-99), { message, type }]);
  //     } catch (e) {
  //       console.error('Malformed log:', event.data);
  //     }
  //   };

  //   eventSource.onerror = () => {
  //     setLogs(prev => [...prev, { message: '⚠️ Log stream disconnected.', type: 'error' }]);
  //     eventSource.close();
  //   };

  //   return () => eventSource.close();
  // }, []);

  useEffect(() => {
    const eventSource = new EventSource('http://localhost:5000/api/logs');
    // const eventSource = new EventSource('/api/logs');

    // const eventSource = new EventSource('/api/logs');
    eventSource.onmessage = (event) => {
      try {
        const { message, type } = JSON.parse(event.data);
        setLogs(prev => [...prev.slice(-99), { message, type }]);
      } catch (e) {
        console.error('Malformed log:', event.data);
      }
    };

    eventSource.onerror = () => {
      setLogs(prev => [...prev, { message: '⚠️ Log stream disconnected.', type: 'error' }]);
      eventSource.close();
    };

    return () => eventSource.close();
  }, []);

  const clearLogs = () => setLogs([]);

  return (
    <div className="bg-black text-sm p-4 rounded-lg max-h-64 overflow-y-auto shadow-inner border border-gray-700 font-mono relative">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-green-300 font-semibold">Server Logs</h4>
        <button
          onClick={clearLogs}
          className="text-xs px-2 py-0.5 border border-gray-500 rounded hover:bg-gray-800 text-gray-300"
        >
          Clear Logs
        </button>
      </div>
      {logs.length === 0 ? (
        <p className="text-gray-500">No logs yet...</p>
      ) : (
        logs.map((log, i) => (
          <div key={i} className={typeStyles[log.type] || 'text-white'}>
            {log.message}
          </div>
        ))
      )}
    </div>
  );
}