import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import * as fabric from 'fabric';

import 'react-pdf/src/Page/AnnotationLayer.css';
import 'react-pdf/src/Page/TextLayer.css';
import './App.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

const App = () => {
  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [annotationMode, setAnnotationMode] = useState<'pen' | 'highlighter' | 'eraser' | null>(null);
  const [penColor, setPenColor] = useState<string>('#000000');
  const [penSize, setPenSize] = useState<number>(2);
  const [highlighterColor, setHighlighterColor] = useState<string>('#FFFF00');
  const [highlighterSize, setHighlighterSize] = useState<number>(10);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setCurrentPage(1);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleAnnotationToolSelect = (tool: 'pen' | 'highlighter' | 'eraser') => {
    setAnnotationMode(tool);
  };

  // Initialize Fabric.js canvas when PDF page loads
  useEffect(() => {
    if (!canvasRef.current || !pageRef.current) return;

    // Reset fabric canvas
    if (fabricRef.current) {
      fabricRef.current.dispose();
    }

    const canvas = new fabric.Canvas(canvasRef.current, {
      isDrawingMode: true,
      width: pageRef.current.clientWidth,
      height: pageRef.current.clientHeight,
      preserveObjectStacking: true
    });

    fabricRef.current = canvas;

    // Set up drawing mode based on selected tool
    const updateDrawingMode = () => {
      if (!fabricRef.current) return;

      const canvas = fabricRef.current;
      canvas.isDrawingMode = false;

      if (annotationMode === 'pen' || annotationMode === 'highlighter') {
        canvas.isDrawingMode = true;
        if (canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush.color = annotationMode === 'pen' ? penColor : highlighterColor;
          canvas.freeDrawingBrush.width = annotationMode === 'pen' ? penSize : highlighterSize;
          // Type assertion to handle opacity property
          (canvas.freeDrawingBrush as any).opacity = annotationMode === 'pen' ? 1 : 0.5;
          canvas.freeDrawingBrush.strokeLineCap = 'round';
          canvas.freeDrawingBrush.strokeLineJoin = 'round';
        }
      } else if (annotationMode === 'eraser') {
        // In Fabric.js 6.x, EraserBrush is replaced with erase mode
        canvas.isDrawingMode = true;
        if (canvas.freeDrawingBrush) {
          // Type assertion to handle mode property
          (canvas.freeDrawingBrush as any).mode = 'erase';
          canvas.freeDrawingBrush.width = 20;
        }
      } else {
        canvas.isDrawingMode = false;
      }
    };

    updateDrawingMode();

    

    // Handle window resize
    const handleResize = () => {
      if (fabricRef.current && pageRef.current) {
        fabricRef.current.setWidth(pageRef.current.clientWidth);
        fabricRef.current.setHeight(pageRef.current.clientHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (fabricRef.current) {
        fabricRef.current.dispose();
        fabricRef.current = null;
      }
    };
  }, [annotationMode, penColor, penSize, highlighterColor, highlighterSize, currentPage]);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>PDF标注工具</h1>
        <div className="file-upload-container">
          <input
            type="file"
            accept=".pdf"
            onChange={onFileChange}
            className="file-input"
          />
          <label className="file-label">
            选择PDF文件
          </label>
        </div>
      </header>

      <main className="app-main">
        {file && (
          <div className="pdf-container">
            <div className="toolbar">
              <div className="tool-group">
                <button
                  className={`tool-button ${annotationMode === 'pen' ? 'active' : ''}`}
                  onClick={() => handleAnnotationToolSelect('pen')}
                >
                  钢笔
                </button>
                <input
                  type="color"
                  value={penColor}
                  onChange={(e) => setPenColor(e.target.value)}
                  disabled={annotationMode !== 'pen'}
                  className="color-picker"
                />
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={penSize}
                  onChange={(e) => setPenSize(parseInt(e.target.value))}
                  disabled={annotationMode !== 'pen'}
                  className="size-input"
                />
              </div>
              
              <div className="tool-group">
                <button
                  className={`tool-button ${annotationMode === 'highlighter' ? 'active' : ''}`}
                  onClick={() => handleAnnotationToolSelect('highlighter')}
                >
                  荧光笔
                </button>
                <input
                  type="color"
                  value={highlighterColor}
                  onChange={(e) => setHighlighterColor(e.target.value)}
                  disabled={annotationMode !== 'highlighter'}
                  className="color-picker"
                />
                <input
                  type="number"
                  min="5"
                  max="20"
                  value={highlighterSize}
                  onChange={(e) => setHighlighterSize(parseInt(e.target.value))}
                  disabled={annotationMode !== 'highlighter'}
                  className="size-input"
                />
              </div>
              
              <div className="tool-group">
                <button
                  className={`tool-button ${annotationMode === 'eraser' ? 'active' : ''}`}
                  onClick={() => handleAnnotationToolSelect('eraser')}
                >
                  橡皮擦
                </button>
              </div>
            </div>
            
            <div className="pdf-viewer">
              <Document
                file={file}
                onLoadSuccess={onDocumentLoadSuccess}
                className="pdf-document"
              >
                <div ref={pageRef} className="page-container">
                  <Page pageNumber={currentPage} className="pdf-page" />
                  <canvas
                    ref={canvasRef}
                    className="annotation-canvas"
                  />
                </div>
              </Document>
              
              <div className="page-controls">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  上一页
                </button>
                <span>
                  第 {currentPage} / {numPages} 页
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === numPages}
                >
                  下一页
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
