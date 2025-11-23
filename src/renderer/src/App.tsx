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
    <div className="flex h-screen w-screen overflow-hidden">
      
      {/* --- SIDEBAR --- */}
      <div className="w-48 bg-gray-100 border-r border-gray-300 flex flex-col overflow-y-auto">
        <div className="p-4 border-b border-gray-300 font-bold">Pages</div>
        
        {/* Page List */}
        <div className="flex-1 p-2 space-y-2">
            {pages.map((page, index) => (
                <div 
                    key={page.id}
                    onClick={() => switchToPage(page.id)}
                    className={`cursor-pointer border-2 rounded p-2 ${activePageId === page.id ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'}`}
                >
                    <div className="text-xs font-bold mb-1">Page {index + 1}</div>
                    {/* Thumbnail */}
                    <div className="h-24 w-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        {page.thumbnail ? (
                            <img src={page.thumbnail} className="object-contain h-full w-full" />
                        ) : (
                            <span className="text-gray-400 text-xs">Blank</span>
                        )}
                    </div>
                </div>
            ))}
        </div>

        {/* Controls */}
        <div className="p-2 border-t border-gray-300 space-y-2">
            <button 
                onClick={addNewPage}
                className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition"
            >
                + New Page
            </button>
            <label className="block w-full text-center bg-green-600 text-white p-2 rounded cursor-pointer hover:bg-green-700 transition">
                Import PDF
                <input type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload}/>
            </label>
        </div>
      </div>

      {/* --- MAIN CANVAS --- */}
      <div className="flex-1 h-full relative">
        <Excalidraw 
            excalidrawAPI={(api) => excalidrawRef.current = api}
            initialData={{ appState: { viewBackgroundColor: "#ffffff" } }}
        />
      </div>
    </div>
  );
}

export default App;