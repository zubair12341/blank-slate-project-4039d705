// Utility hook for printing with proper image loading
// This ensures images (like logos) are fully loaded before printing

const THERMAL_PAPER_WIDTH_MM = 72;
const PX_PER_INCH = 96;
const MM_PER_INCH = 25.4;
const IMAGE_LOAD_TIMEOUT_MS = 4000;
const PRINT_CLEANUP_DELAY_MS = 800;

const pxToMm = (pixels: number): number => (pixels * MM_PER_INCH) / PX_PER_INCH;

const applyThermalPrintSizing = (doc: Document): void => {
  const body = doc.body;
  if (!body) return;

  const root = doc.documentElement;
  const contentHeightPx = Math.max(
    body.scrollHeight,
    body.offsetHeight,
    body.getBoundingClientRect().height,
    root?.scrollHeight ?? 0,
    root?.offsetHeight ?? 0,
  );

  const contentHeightMm = Math.min(420, Math.max(82, Math.ceil(pxToMm(contentHeightPx) + 4)));
  const style = doc.createElement('style');
  style.setAttribute('data-thermal-print-style', 'true');
  style.textContent = `
    @page {
      size: ${THERMAL_PAPER_WIDTH_MM}mm ${contentHeightMm}mm !important;
      margin: 0 !important;
    }

    html, body {
      width: ${THERMAL_PAPER_WIDTH_MM}mm !important;
      min-width: ${THERMAL_PAPER_WIDTH_MM}mm !important;
      max-width: ${THERMAL_PAPER_WIDTH_MM}mm !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
    }

    body {
      height: ${contentHeightMm}mm !important;
      min-height: ${contentHeightMm}mm !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  `;

  if (doc.head) {
    doc.head.appendChild(style);
  } else {
    body.insertAdjacentElement('beforebegin', style);
  }
};

export function printWithImages(html: string, onPrinted?: () => void): void {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.width = `${THERMAL_PAPER_WIDTH_MM}mm`;
  iframe.style.height = '1px';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.style.left = '-9999px';
  iframe.style.top = '0';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    return;
  }

  const fullHtml = html.trimStart().toLowerCase().startsWith('<!doctype')
    ? html
    : `<!DOCTYPE html>${html}`;

  iframeDoc.open();
  iframeDoc.write(fullHtml);
  iframeDoc.close();

  let hasPrinted = false;

  const cleanup = () => {
    if (iframe.parentNode) {
      document.body.removeChild(iframe);
    }
    onPrinted?.();
  };

  const triggerPrint = () => {
    if (hasPrinted) return;
    hasPrinted = true;

    applyThermalPrintSizing(iframeDoc);

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(cleanup, PRINT_CLEANUP_DELAY_MS);
    }, 120);
  };

  const images = iframeDoc.querySelectorAll('img');

  if (images.length === 0) {
    triggerPrint();
    return;
  }

  let loadedCount = 0;
  const totalImages = images.length;

  const markLoaded = () => {
    loadedCount += 1;
    if (loadedCount >= totalImages) {
      triggerPrint();
    }
  };

  images.forEach((img) => {
    if (img.complete) {
      markLoaded();
      return;
    }

    img.onload = markLoaded;
    img.onerror = markLoaded;
  });

  setTimeout(() => {
    if (!hasPrinted) {
      triggerPrint();
    }
  }, IMAGE_LOAD_TIMEOUT_MS);
}


// Loud notification sound for kitchen invoice (longer, louder beep)
export function playKitchenNotificationSound(): void {
  // Create a louder, longer alert sound using Web Audio API
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Play 3 beeps for attention
    const playBeep = (startTime: number, frequency: number = 880) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'square';
      oscillator.frequency.value = frequency;
      
      gainNode.gain.setValueAtTime(1.0, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.3);
    };

    const now = audioContext.currentTime;
    playBeep(now, 880);       // First beep
    playBeep(now + 0.35, 988); // Second beep (higher)
    playBeep(now + 0.7, 1046); // Third beep (even higher)
    
  } catch (error) {
    // Fallback to basic audio
    const audio = new Audio('data:audio/wav;base64,UklGRrQFAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YZAFAABwgHCAcIBwgHCAcIBwgHCAcIBwgP9//3//f/9//3//f/9//3//f/9/cIBwgHCAcIBwgHCAcIBwgHCAcIBwgP9//3//f/9//3//f/9//3//f/9/cIBwgHCAcIBwgHCAcIBwgHCAcIBwgP9//3//f/9//3//f/9//3//f/9/cIBwgHCAcIBwgHCAcIBwgHCAcIBwgP9//3//f/9//3//f/9//3//f/9/cIBwgHCAcIBwgHCAcIBwgHCAcIBwgP9//3//f/9//3//f/9//3//f/9/');
    audio.volume = 1.0;
    audio.play().catch(() => console.log('Audio blocked'));
  }
}
