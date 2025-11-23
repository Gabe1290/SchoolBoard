import { Excalidraw, WelcomeScreen } from "@excalidraw/excalidraw";
// 1. This import is CRITICAL. Without it, the toolbar is invisible.
import "@excalidraw/excalidraw/index.css";

function App() {
  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <Excalidraw 
        theme="light"
        // 2. Ensure we are not in View Mode
        viewModeEnabled={false}
        zenModeEnabled={false}
        gridModeEnabled={false}
        // 3. Set a nice white background
        initialData={{
            appState: { viewBackgroundColor: "#ffffff" }
        }}
      >
        {/* 4. Turn off the "Welcome" screen so you can draw immediately */}
        <WelcomeScreen>
            <WelcomeScreen.Center>
                <WelcomeScreen.Center.Logo />
                <WelcomeScreen.Center.Heading>
                    School Whiteboard
                </WelcomeScreen.Center.Heading>
                <WelcomeScreen.Center.Menu>
                    <WelcomeScreen.Center.MenuItemHelp />
                </WelcomeScreen.Center.Menu>
            </WelcomeScreen.Center>
        </WelcomeScreen>
      </Excalidraw>
    </div>
  );
}

export default App;