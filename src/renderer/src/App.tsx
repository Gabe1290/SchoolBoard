import React, { useState, useRef } from 'react';
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { v4 as uuidv4 } from 'uuid';
import { convertPdfToImages } from './pdfUtils';

type Page = {
  id: string;
  elements: any[];
  appState: any;
  thumbnail?: string;
  files?: any; // To store image data
};

function App() {
  const [pages, setPages] = useState<Page[]>([
    { id: uuidv4(), elements: [], appState: { viewBackgroundColor: "#ffffff" } }
  ]);
  const [activePageId, setActivePageId] = useState<string>(pages[0].id);
  const excalidrawRef = useRef<any>(null);

  const saveCurrentPage = () => {
    if (!excalidrawRef.current) return;
    const elements = excalidrawRef.current.getSceneElements();
    const appState = excalidrawRef.current.getAppState();
    // Also get files (images) from the scene
    const files = excalidrawRef.current.getFiles();

    setPages(prevPages => prevPages.map(p => 
      p.id === activePageId 
        ? { ...p, elements, appState: { ...p.appState, ...appState }, files } 
        : p
    ));
  };

  const switchToPage = (pageId: string) => {
    saveCurrentPage();
    setActivePageId(pageId);
    
    const nextPage = pages.find(p => p.id === pageId);
    if (nextPage && excalidrawRef.current) {
      // Restore files first so images render
      if (nextPage.files) {
        excalidrawRef.current.addFiles(Object.values(nextPage.files));
      }
      excalidrawRef.current.updateScene({
        elements: nextPage.elements,
        appState: nextPage.appState
      });
    }
  };

  const addNewPage = () => {
    saveCurrentPage();
    const newPage = { 
        id: uuidv4(), 
        elements: [], 
        appState: { viewBackgroundColor: "#ffffff" } 
    };
    setPages(prev => [...prev, newPage]);
    setActivePageId(newPage.id);
    // Reset canvas for new page
    setTimeout(() => {
        if(excalidrawRef.current) excalidrawRef.current.resetScene();
    }, 50);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const buttonLabel = e.target.parentElement;
    if(buttonLabel) buttonLabel.innerText = "Processing...";

    try {
        const imageUrls = await convertPdfToImages(file);

        const newPages: Page[] = imageUrls.map(url => {
            const imageId = uuidv4();
            const imageElement = {
                type: "image",
                fileId: imageId,
                status: "saved",
                x: 0, y: 0, width: 600, height: 800,
                id: uuidv4(),
            };

            return {
                id: uuidv4(),
                elements: [imageElement],
                appState: { viewBackgroundColor: "#e5e7eb" },
                thumbnail: url,
                files: { [imageId]: { id: imageId, dataURL: url, mimeType: "image/png", created: Date.now() } }
            };
        });

        saveCurrentPage();
        setPages(prev => [...prev, ...newPages]);
        
        if (newPages.length > 0) {
            setActivePageId(newPages[0].id);
            setTimeout(() => {
                if (excalidrawRef.current) {
                    // Inject the files into Excalidraw's cache
                    const allFiles = {};
                    newPages.forEach(p => Object.assign(allFiles, p.files));
                    excalidrawRef.current.addFiles(Object.values(allFiles));
                    
                    excalidrawRef.current.updateScene({ 
                        elements: newPages[0].elements,
                        appState: newPages[0].appState
                    });
                }
            }, 100);
        }
    } catch (err) {
        alert("Error loading PDF: " + err);
        console.error(err);
    } finally {
        if(buttonLabel) buttonLabel.innerText = "Import PDF";
        e.target.value = "";
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden" }}>
      {/* SIDEBAR */}
      <div style={{ width: "200px", backgroundColor: "#f3f4f6", borderRight: "1px solid #d1d5db", display: "flex", flexDirection: "column", overflowY: "auto" }}>
        <div style={{ padding: "1rem", borderBottom: "1px solid #d1d5db", fontWeight: "bold" }}>Pages</div>
        <div style={{ flex: 1, padding: "0.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {pages.map((page, index) => (
                <div key={page.id} onClick={() => switchToPage(page.id)}
                    style={{
                        cursor: "pointer",
                        border: activePageId === page.id ? "2px solid #3b82f6" : "1px solid #d1d5db",
                        backgroundColor: activePageId === page.id ? "#eff6ff" : "white",
                        padding: "0.5rem", borderRadius: "4px"
                    }}
                >
                    <div style={{ fontSize: "0.75rem", fontWeight: "bold", marginBottom: "4px" }}>Page {index + 1}</div>
                    <div style={{ height: "60px", backgroundColor: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                        {page.thumbnail ? <img src={page.thumbnail} style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <span style={{ fontSize: "10px", color: "#9ca3af" }}>Blank</span>}
                    </div>
                </div>
            ))}
        </div>
        <div style={{ padding: "0.5rem", borderTop: "1px solid #d1d5db", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <button onClick={addNewPage} style={{ width: "100%", backgroundColor: "#2563eb", color: "white", padding: "8px", borderRadius: "4px", border: "none", cursor: "pointer" }}>+ New Page</button>
            <label style={{ display: "block", width: "100%", textAlign: "center", backgroundColor: "#16a34a", color: "white", padding: "8px", borderRadius: "4px", cursor: "pointer" }}>
                Import PDF <input type="file" accept=".pdf" style={{ display: "none" }} onChange={handlePdfUpload}/>
            </label>
        </div>
      </div>
      {/* MAIN CANVAS */}
      <div style={{ flex: 1, position: "relative", height: "100%" }}>
        <Excalidraw excalidrawAPI={(api) => excalidrawRef.current = api} initialData={{ appState: { viewBackgroundColor: "#ffffff" } }} />
      </div>
    </div>
  );
}
export default App;
