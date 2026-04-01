/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, Image as ImageIcon, Trash2, Grid3X3, Loader2, CheckCircle2, Code, Terminal, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { cn } from './lib/utils';

interface SplitImage {
  id: number;
  url: string;
  blob: Blob;
}

export default function App() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [splitImages, setSplitImages] = useState<SplitImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const apiEndpoint = `${window.location.origin}/api/split`;
  const curlExample = `curl -X POST ${apiEndpoint} \\
  -F "image=@your_storyboard.png"`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(curlExample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file');
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      setOriginalImage(e.target?.result as string);
      setSplitImages([]);
    };
    reader.readAsDataURL(file);
  };

  const splitStoryboard = useCallback(async () => {
    if (!originalImage) return;
    setIsProcessing(true);
    setError(null);

    try {
      const img = new Image();
      img.src = originalImage;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Unable to create Canvas context');

      const frameWidth = img.width / 3;
      const frameHeight = img.height / 3;
      canvas.width = frameWidth;
      canvas.height = frameHeight;

      const newImages: SplitImage[] = [];

      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          ctx.clearRect(0, 0, frameWidth, frameHeight);
          ctx.drawImage(
            img,
            col * frameWidth,
            row * frameHeight,
            frameWidth,
            frameHeight,
            0,
            0,
            frameWidth,
            frameHeight
          );

          const blob = await new Promise<Blob | null>((resolve) => 
            canvas.toBlob((b) => resolve(b), 'image/png', 1.0)
          );

          if (blob) {
            newImages.push({
              id: row * 3 + col + 1,
              url: URL.createObjectURL(blob),
              blob: blob,
            });
          }
        }
      }

      setSplitImages(newImages);
    } catch (err) {
      console.error(err);
      setError('Error processing image, please try again');
    } finally {
      setIsProcessing(false);
    }
  }, [originalImage]);

  const downloadAll = async () => {
    if (splitImages.length === 0) return;
    const zip = new JSZip();
    splitImages.forEach((img) => {
      zip.file(`frame_${img.id}.png`, img.blob);
    });
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'storyboard_frames.zip');
  };

  const reset = () => {
    setOriginalImage(null);
    setSplitImages([]);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] font-sans selection:bg-[#F27D26] selection:text-white">
      {/* Header */}
      <header className="border-b border-[#E5E5E5] bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#F27D26] rounded-lg flex items-center justify-center">
              <Grid3X3 className="text-white w-5 h-5" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">Storyboard Splitter Pro</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-full border border-green-100">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider">API Online</span>
            </div>
            <div className="text-xs font-mono text-[#8E8E8E] uppercase tracking-widest">
              v1.2.0
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 space-y-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column: Upload & Original */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-serif italic text-[#141414]">Upload Storyboard</h2>
              <p className="text-[#8E8E8E] text-sm">Upload a 3x3 grid storyboard image, and we'll split it into 9 high-definition original frames.</p>
            </div>

            {!originalImage ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "relative group cursor-pointer",
                  "border-2 border-dashed border-[#E5E5E5] rounded-2xl p-12",
                  "hover:border-[#F27D26] hover:bg-[#FFF9F5] transition-all duration-300",
                  "flex flex-col items-center justify-center text-center gap-4"
                )}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files?.[0];
                  if (file) processFile(file);
                }}
              >
                <div className="w-16 h-16 bg-[#F5F5F5] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Upload className="text-[#8E8E8E] group-hover:text-[#F27D26] w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Click or drag image here</p>
                  <p className="text-xs text-[#8E8E8E]">Supports JPG, PNG, WEBP (High resolution recommended)</p>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                <div className="relative rounded-2xl overflow-hidden border border-[#E5E5E5] bg-white shadow-sm group">
                  <img src={originalImage} alt="Original" className="w-full h-auto" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      onClick={reset}
                      className="p-3 bg-white rounded-full text-red-500 hover:bg-red-50 transition-colors"
                      title="Remove Image"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                {splitImages.length === 0 && (
                  <button
                    onClick={splitStoryboard}
                    disabled={isProcessing}
                    className={cn(
                      "w-full py-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all",
                      "bg-[#141414] text-white hover:bg-[#2A2A2A] active:scale-[0.98]",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Grid3X3 className="w-5 h-5" />
                        Split Image Now
                      </>
                    )}
                  </button>
                )}
              </motion.div>
            )}

            {error && (
              <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
                {error}
              </p>
            )}
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {splitImages.length > 0 ? (
                <motion.div
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-8"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="text-green-500 w-5 h-5" />
                      <h3 className="text-xl font-medium">Split Complete ({splitImages.length} frames)</h3>
                    </div>
                    <button
                      onClick={downloadAll}
                      className="flex items-center gap-2 text-sm font-medium text-[#F27D26] hover:underline"
                    >
                      <Download className="w-4 h-4" />
                      Download All (ZIP)
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {splitImages.map((img, index) => (
                      <motion.div
                        key={img.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="group relative aspect-video bg-[#F5F5F5] rounded-xl overflow-hidden border border-[#E5E5E5]"
                      >
                        <img src={img.url} alt={`Frame ${img.id}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                          <span className="text-white text-xs font-mono">FRAME {img.id}</span>
                          <button
                            onClick={() => saveAs(img.blob, `frame_${img.id}.png`)}
                            className="p-2 bg-white rounded-full text-[#141414] hover:bg-[#F27D26] hover:text-white transition-all"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="p-6 bg-[#FFF9F5] rounded-2xl border border-[#FEE8D6] flex items-start gap-4">
                    <div className="p-2 bg-[#F27D26] rounded-lg">
                      <ImageIcon className="text-white w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-medium text-[#F27D26]">Ultra HD Export</h4>
                      <p className="text-sm text-[#8E8E8E] mt-1">
                        All images are split at original resolution and exported in lossless PNG format, ensuring perfect detail preservation.
                      </p>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-12 border border-[#E5E5E5] rounded-3xl bg-white/50 border-dashed">
                  <div className="w-20 h-20 bg-[#F5F5F5] rounded-full flex items-center justify-center mb-6">
                    <ImageIcon className="text-[#D1D1D1] w-10 h-10" />
                  </div>
                  <h3 className="text-lg font-medium text-[#8E8E8E]">Waiting for upload and processing</h3>
                  <p className="text-sm text-[#D1D1D1] mt-2 max-w-xs">
                    Split results will be previewed here in real-time. You can download individual frames or all at once.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* API Documentation Section */}
        <section className="pt-16 border-t border-[#E5E5E5]">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#141414] text-white rounded-full text-[10px] font-bold uppercase tracking-widest mb-2">
                <Code className="w-3 h-3" />
                Developer API
              </div>
              <h2 className="text-3xl font-serif italic">Open API Interface</h2>
              <p className="text-[#8E8E8E] text-sm">
                We currently use **pure image processing algorithms** (non-AI) for splitting to ensure 100% geometric precision.
                You can call our backend API directly for automated processing.
              </p>
            </div>

            <div className="bg-[#151619] rounded-2xl overflow-hidden shadow-2xl">
              <div className="px-4 py-3 bg-[#2A2A2A] border-b border-[#3A3A3A] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#8E8E8E]" />
                  <span className="text-xs font-mono text-[#8E8E8E]">cURL Example</span>
                </div>
                <button 
                  onClick={copyToClipboard}
                  className="text-[#8E8E8E] hover:text-white transition-colors p-1"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="p-6 overflow-x-auto">
                <pre className="text-sm font-mono text-[#E0E0E0] leading-relaxed">
                  {curlExample}
                </pre>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl border border-[#E5E5E5] bg-white space-y-3">
                <h4 className="font-bold text-sm flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  Request Parameters
                </h4>
                <ul className="text-xs text-[#8E8E8E] space-y-2 font-mono">
                  <li>Method: POST</li>
                  <li>Body: multipart/form-data</li>
                  <li>Field: image (File)</li>
                </ul>
              </div>
              <div className="p-6 rounded-2xl border border-[#E5E5E5] bg-white space-y-3">
                <h4 className="font-bold text-sm flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  Response Results
                </h4>
                <ul className="text-xs text-[#8E8E8E] space-y-2 font-mono">
                  <li>Status: 200 OK</li>
                  <li>Type: application/json</li>
                  <li>Data: &#123; frames: string[] &#125;</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5E5E5] py-12 mt-12 bg-white">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 opacity-50">
            <Grid3X3 className="w-4 h-4" />
            <span className="text-xs font-mono uppercase tracking-tighter">Storyboard Splitter</span>
          </div>
          <p className="text-xs text-[#8E8E8E]">© 2026 Professional video storyboard processing tool</p>
          <div className="flex gap-6 text-xs text-[#8E8E8E]">
            <a href="#" className="hover:text-[#141414] transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-[#141414] transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
