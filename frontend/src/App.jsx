import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:5001", { transports: ["websocket"] });

export default function App() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    // Fetch initial logs
    fetch("http://localhost:5001/api/logs")
      .then((res) => res.json())
      .then(setLogs)
      .catch(console.error);

    // Socket events
    socket.on("new_log", (log) => setLogs((prev) => [log, ...prev]));
    socket.on("logs_cleared", () => setLogs([]));
    socket.on("log_removed", (id) =>
      setLogs((prev) => prev.filter((l) => l.id !== id))
    );

    return () => {
      socket.off("new_log");
      socket.off("logs_cleared");
      socket.off("log_removed");
    };
  }, []);

  const filteredLogs = logs.filter((l) =>
    JSON.stringify(l).toLowerCase().includes(search.toLowerCase())
  );

  const removeLog = async (id) => {
    try {
      await fetch(`http://localhost:5001/api/logs/${id}`, { method: "DELETE" });
      setLogs((prev) => prev.filter((log) => log.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const clearAllLogs = async () => {
    if (!window.confirm("Are you sure you want to clear all logs?")) return;
    try {
      await fetch("http://localhost:5001/api/logs/clear", { method: "DELETE" });
      setLogs([]);
    } catch (err) {
      console.error(err);
    }
  };

  const isSuspicious = (ua) => {
    const keywords = ["sqlmap", "curl", "python", "nmap", "bruteforce", "bot"];
    return keywords.some((w) => ua?.toLowerCase().includes(w));
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-gray-900 text-gray-100 font-sans">
      {/* NAVBAR */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 shadow-md bg-gray-800">
        <h1 className="text-xl font-semibold text-blue-400">Honeypot Dashboard</h1>
        <nav className="space-x-6 text-gray-300 text-sm font-medium">
          <a href="#logs" className="hover:text-blue-400 transition">Logs</a>
          <a href="#stats" className="hover:text-blue-400 transition">Stats</a>
          <a href="#alerts" className="hover:text-blue-400 transition">Alerts</a>
          <a href="#settings" className="hover:text-blue-400 transition">Settings</a>
        </nav>
      </div>

      {/* SIDEBAR */}
      <div className="fixed top-16 left-0 w-56 h-[calc(100%-4rem)] bg-gray-800 border-r border-gray-700 p-4 hidden md:block">
        <div className="flex flex-col space-y-3 text-gray-200 text-sm font-medium">
          <a href="#logs" className="px-3 py-2 rounded hover:bg-blue-600/20 transition">Logs</a>
          <a href="#stats" className="px-3 py-2 rounded hover:bg-blue-600/20 transition">Statistics</a>
          <a href="#alerts" className="px-3 py-2 rounded hover:bg-blue-600/20 transition">Alerts</a>
          <a href="#geo" className="px-3 py-2 rounded hover:bg-blue-600/20 transition">Geo Map</a>
          <a href="#settings" className="px-3 py-2 rounded hover:bg-blue-600/20 transition">Settings</a>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 p-6 ml-0 space-y-6 md:ml-60">
        {/* LOGS */}
        <section id="logs" className="p-6 shadow-lg bg-gray-800/70 backdrop-blur-md rounded-xl">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold text-blue-400">Attack Logs</h2>
            <button
              onClick={clearAllLogs}
              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 rounded transition"
            >
              Clear All Logs
            </button>
          </div>

          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 mb-4 border rounded bg-gray-700 border-gray-600 focus:outline-none focus:border-blue-400 text-sm"
          />

          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-blue-400 bg-gray-700/50">
                <th className="px-3 py-2 text-left">IP</th>
                <th className="px-3 py-2 text-left">Time</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Path</th>
                <th className="px-3 py-2 text-left">Details</th>
                <th className="px-3 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-6 text-center text-gray-400">No logs found...</td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className={`${isSuspicious(log.ua) ? "bg-red-800/20" : "hover:bg-blue-600/20"} transition`}
                  >
                    <td className="px-3 py-2">{log.ip}</td>
                    <td className="px-3 py-2">{log.time}</td>
                    <td className="px-3 py-2 capitalize">{log.type}</td>
                    <td className="px-3 py-2">{log.path || "-"}</td>
                    <td className="px-3 py-2">
                      <details>
                        <summary className="cursor-pointer text-gray-300">View</summary>
                        <div className="mt-1 text-xs text-gray-200">
                          <p><strong>User-Agent:</strong> {log.ua}</p>
                          {log.payload && (
                            <pre className="p-2 mt-1 bg-gray-700 rounded">{`Username: ${log.payload.username || ""}\nPassword: ${log.payload.password || ""}`}</pre>
                          )}
                        </div>
                      </details>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => removeLog(log.id)}
                        className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 rounded transition"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        {/* STATS */}
        <section id="stats" className="p-6 shadow-lg bg-gray-800/70 backdrop-blur-md rounded-xl">
          <h2 className="mb-3 text-lg font-semibold text-blue-400">Statistics</h2>
          <p>Number of attacks today: <span className="font-semibold">{logs.length}</span></p>
        </section>

        {/* ALERTS */}
        <section id="alerts" className="p-6 shadow-lg bg-gray-800/70 backdrop-blur-md rounded-xl">
          <h2 className="mb-3 text-lg font-semibold text-blue-400">Alerts</h2>
          <p>No critical alerts.</p>
        </section>
      </div>

      {/* TASKBAR */}
      <div className="flex items-center justify-between h-12 px-6 border-t bg-gray-800/50 backdrop-blur-md border-gray-700">
        <span className="text-gray-400">Logged in as Admin</span>
        <span className="text-gray-400">© 2025 VEYK</span>
      </div>
    </div>
  );
}
