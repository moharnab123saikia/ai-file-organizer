import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  async function greet() {
    try {
      const message = await invoke<string>("greet", { name: name || "World" });
      setGreetMsg(message);
    } catch (error) {
      console.error("Error calling greet:", error);
      setGreetMsg(`Error: ${error}`);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            AI File Organizer
          </h1>
          <p className="text-gray-600 mt-2">
            Organize your files intelligently using AI and the Johnny Decimal system
          </p>
        </header>

        {/* Test Tauri Communication */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Test Backend Communication</h3>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={greet}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Greet
            </button>
          </div>
          {greetMsg && (
            <div className="mt-2 p-2 bg-white border border-gray-200 rounded text-green-700">
              {greetMsg}
            </div>
          )}
        </div>

        <main>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* File Explorer Pane */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold mb-4">File Explorer</h2>
              <div className="text-gray-500 text-center py-8">
                File explorer will be implemented here
              </div>
            </div>

            {/* Organization Pane */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold mb-4">Organization</h2>
              <div className="text-gray-500 text-center py-8">
                Organization panel will be implemented here
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;