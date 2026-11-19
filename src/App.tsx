import { useState } from "react";

import "./App.css";
import { QRcodeScanner } from "./QRcodeScanner";

const ENABLE_DEBUG = true;

function App() {
  const [code, setCode] = useState("");

  return (
    <main>
      {code ? (
        <section className="result">
          <p>Code found: {code}</p>
          <button onClick={() => setCode("")}>scan again</button>
        </section>
      ) : (
        <QRcodeScanner onCode={setCode} />
      )}
      {ENABLE_DEBUG && <canvas id="qr-debug" style={{ width: "100%" }} />}
    </main>
  );
}

export default App;
