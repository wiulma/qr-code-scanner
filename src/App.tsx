import { useState } from "react";

import "./App.css";
import { QRcodeScanner } from "./QRcodeScanner";

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
    </main>
  );
}

export default App;
