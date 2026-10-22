
import { useEffect, useState } from "react";
import { checkHealth } from "./services/healthService";

function App() {
  const [message, setMessage] = useState("Connecting...");
  const [error, setError] = useState("");

  useEffect(() => {
    checkHealth()
      .then((data) => setMessage(data.message))
      .catch(() => {
        setError("Could not connect to FastAPI.");
      });
  }, []);

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">
        Frontend + Backend Connection
      </h1>

      {error ? (
        <p className="mt-4 text-red-600">{error}</p>
      ) : (
        <p className="mt-4">{message}</p>
      )}
    </main>
  );
}

export default App;
