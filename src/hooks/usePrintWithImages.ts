// Utility hook for printing with proper image loading
// This ensures images (like logos) are fully loaded before printing

export function printWithImages(html: string, onPrinted?: () => void): void {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.style.left = '-9999px';
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

  // Find all images in the iframe
  const images = iframeDoc.querySelectorAll('img');
  
  if (images.length === 0) {
    // No images, print immediately
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
      onPrinted?.();
    }, 1000);
    return;
  }

  // Wait for all images to load before printing
  let loadedCount = 0;
  const totalImages = images.length;

  const checkAllLoaded = () => {
    loadedCount++;
    if (loadedCount >= totalImages) {
      // All images loaded, now print
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
          onPrinted?.();
        }, 1000);
      }, 100); // Small delay to ensure rendering is complete
    }
  };

  images.forEach((img) => {
    if (img.complete) {
      checkAllLoaded();
    } else {
      img.onload = checkAllLoaded;
      img.onerror = checkAllLoaded; // Count errors as loaded to avoid hanging
    }
  });

  // Fallback timeout in case images take too long
  setTimeout(() => {
    if (loadedCount < totalImages) {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
        onPrinted?.();
      }, 1000);
    }
  }, 3000);
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
