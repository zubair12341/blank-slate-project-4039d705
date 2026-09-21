// Utility hook for printing with proper image loading
// This ensures images (like logos) are fully loaded before printing

const THERMAL_PAPER_WIDTH_MM = 72;
const IMAGE_LOAD_TIMEOUT_MS = 4000;
const PRINT_CLEANUP_DELAY_MS = 800;

const applyThermalPrintSizing = (doc: Document): void => {
  const body = doc.body;
  if (!body) return;

  const style = doc.createElement('style');
  style.setAttribute('data-thermal-print-style', 'true');
  style.textContent = `
    @page {
      size: ${THERMAL_PAPER_WIDTH_MM}mm auto !important;
      margin: 0 !important;
      padding: 0 !important;
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
      height: auto !important;
      min-height: 0 !important;
      transform: none !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body > *:first-child {
      margin-top: 0 !important;
      padding-top: 0 !important;
    }
  `;

  if (doc.head) {
    doc.head.appendChild(style);
  } else {
    body.insertAdjacentElement('beforebegin', style);
  }
};

export function printWithImages(_html: string, onPrinted?: () => void): void {
  // Native browser printing is deliberately disabled for the POS and always
  // opens browser UI in normal Chrome and must never be used for restaurant jobs.
  // All KOT/receipt printing goes through localPrintBridge -> Windows spooler.
  console.error('Legacy browser print blocked: use localPrintBridge instead.');
  onPrinted?.();
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
