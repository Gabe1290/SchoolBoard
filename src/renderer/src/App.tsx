import React, { useState, useRef, useEffect } from 'react';
import { Excalidraw, convertToExcalidrawElements } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { v4 as uuidv4 } from 'uuid';
import { convertPdfToImages } from './pdfUtils';

// Define what a "Page" looks like
type Page = {
  id: string;
  elements: any[]; // The drawings
  appState: any;   // The view position (scroll X/Y)
  thumbnail?: string; // Small image for sidebar
};

function App() {
  // --- STATE ---
  const [pages, setPages] = useState<Page[]>([
    { id: uuidv4(), elements: [], appState: { viewBackgroundColor: "#ffffff" } }
  ]);
  const [activePageId, setActivePageId] = useState<string>(pages[0].id);
  const excalidrawRef = useRef<any>(null);

  // --- LOGIC: SAVE CURRENT PAGE BEFORE SWITCHING ---
  const saveCurrentPage = () => {
    if (!excalidrawRef.current) return;
    
    const elements = excalidrawRef.current.getSceneElements();
    const appState = excalidrawRef.current.getAppState();

    setPages(prevPages => prevPages.map(p => 
      p.id === activePageId 
        ? { ...p, elements, appState: { ...p.appState, ...appState } } 
        : p
    ));
  };

  // --- LOGIC: SWITCH PAGE ---
  const switchToPage = (pageId: string) => {
    saveCurrentPage(); // Save old page first
    setActivePageId(pageId);
    
    // Load new page data
    const nextPage = pages.find(p => p.id === pageId);
    if (nextPage && excalidrawRef.current) {
      excalidrawRef.current.updateScene({
        elements: nextPage.elements,
        appState: nextPage.appState
      });
    }
  };

  // --- LOGIC: ADD NEW BLANK PAGE ---
  const addNewPage = () => {
    saveCurrentPage();
    const newPage = { 
        id: uuidv4(), 
        elements: [], 
        appState: { viewBackgroundColor: "#ffffff" } 
    };
    setPages(prev => [...prev, newPage]);
    setActivePageId(newPage.id);
  };

  // --- LOGIC: IMPORT PDF ---
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    // 1. Convert PDF to images
    const imageUrls = await convertPdfToImages(file);

    // 2. Create a new page for each image
    const newPages: Page[] = imageUrls.map(url => {
        // Create an Excalidraw Image Element
        const imageId = uuidv4();
        const imageElement = {
            type: "image",
            fileId: imageId,
            status: "saved",
            x: 0, y: 0, width: 800, height: 1100, // A4 aspect ratio approx
            id: uuidv4(),
        };

        return {
            id: uuidv4(),
            elements: [imageElement], // Add image to page
            appState: { viewBackgroundColor: "#e0e0e0" }, // Grey bg for docs
            thumbnail: url,
            // We must "hack" files into Excalidraw's cache
            files: { [imageId]: { id: imageId, dataURL: url, mimeType: "image/png" } }
        };
    });

    saveCurrentPage();
    
    // 3. Add to state
    setPages(prev => [...prev, ...newPages]);
    
    // 4. Switch to first PDF page
    if (newPages.length > 0) {
        setActivePageId(newPages[0].id);
        // Delay update to allow state to settle
        setTimeout(() => {
            if (excalidrawRef.current) {
                excalidrawRef.current.addFiles(Object.assign({}, ...newPages.map(p => (p as any).files)));
                excalidrawRef.current.updateScene({ elements: newPages[0].elements });
            }
        }, 100);
    }
  };

  return (
    // MAIN CONTAINER: Flex row, full viewport height
    <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden" }}>
      
      {/* --- SIDEBAR --- */}
      <div style={{ 
          width: "200px", 
          backgroundColor: "#f3f4f6", 
          borderRight: "1px solid #d1d5db", 
          display: "flex", 
          flexDirection: "column",
          overflowY: "auto"
      }}>
        <div style={{ padding: "1rem", borderBottom: "1px solid #d1d5db", fontWeight: "bold" }}>
            Pages
        </div>
        
        {/* Page List */}
        <div style={{ flex: 1, padding: "0.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {pages.map((page, index) => (
                <div 
                    key={page.id}
                    onClick={() => switchToPage(page.id)}
                    style={{
                        cursor: "pointer",
                        border: activePageId === page.id ? "2px solid #3b82f6" : "1px solid #d1d5db",
                        backgroundColor: activePageId === page.id ? "#eff6ff" : "white",
                        padding: "0.5rem",
                        borderRadius: "4px"
                    }}
                >
                    <div style={{ fontSize: "0.75rem", fontWeight: "bold", marginBottom: "4px" }}>
                        Page {index + 1}
                    </div>
                    {/* Thumbnail placeholder */}
                    <div style={{ height: "60px", backgroundColor: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                        {page.thumbnail ? (
                            <img src={page.thumbnail} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                        ) : (
                            <span style={{ fontSize: "10px", color: "#9ca3af" }}>Blank</span>
                        )}
                    </div>
                </div>
            ))}
        </div>

        {/* Controls */}
        <div style={{ padding: "0.5rem", borderTop: "1px solid #d1d5db", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <button 
                onClick={addNewPage}
                style={{ width: "100%", backgroundColor: "#2563eb", color: "white", padding: "8px", borderRadius: "4px", border: "none", cursor: "pointer" }}
            >
                + New Page
            </button>
            <label style={{ display: "block", width: "100%", textAlign: "center", backgroundColor: "#16a34a", color: "white", padding: "8px", borderRadius: "4px", cursor: "pointer" }}>
                Import PDF
                <input type="file" accept=".pdf" style={{ display: "none" }} onChange={handlePdfUpload}/>
            </label>
        </div>
      </div>

      {/* --- MAIN CANVAS WRAPPER --- */}
      {/* This was the broken part. We force it to take all remaining width/height */}
      <div style={{ flex: 1, position: "relative", height: "100%" }}>
        <Excalidraw 
            excalidrawAPI={(api) => excalidrawRef.current = api}
            initialData={{ appState: { viewBackgroundColor: "#ffffff" } }}
        />
      </div>
    </div>
  );
}

export default App;