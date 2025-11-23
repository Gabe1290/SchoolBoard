import { Excalidraw } from "@excalidraw/excalidraw";

function App() {
  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <Excalidraw 
        initialData={{
          appState: { viewBackgroundColor: "#ffffff" }
        }}
      />
    </div>
  );
}

export default App;