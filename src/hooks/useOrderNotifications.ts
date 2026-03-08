import { useEffect, useRef } from 'react';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { toast } from 'sonner';

export function useOrderNotifications() {
  const { orders } = useRestaurant();
  const previousOrdersRef = useRef(orders);
  const isFirstRender = useRef(true);

  // Play loud notification sound using Web Audio API
  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Play 4 loud attention-grabbing beeps
      const playBeep = (startTime: number, frequency: number = 880, duration: number = 0.25) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = 'square';
        oscillator.frequency.value = frequency;
        
        // Full volume for maximum loudness
        gainNode.gain.setValueAtTime(1.0, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      const now = audioContext.currentTime;
      // Play ascending beeps pattern - very attention-grabbing
      playBeep(now, 660, 0.15);
      playBeep(now + 0.2, 880, 0.15);
      playBeep(now + 0.4, 1100, 0.15);
      playBeep(now + 0.6, 1320, 0.2);
      // Repeat pattern for emphasis
      playBeep(now + 0.9, 660, 0.15);
      playBeep(now + 1.1, 880, 0.15);
      playBeep(now + 1.3, 1100, 0.15);
      playBeep(now + 1.5, 1320, 0.2);
      
    } catch (error) {
      // Fallback to basic audio at max volume
      const audio = new Audio('data:audio/wav;base64,UklGRrQFAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YZAFAABwgHCAcIBwgHCAcIBwgHCAcIBwgP9//3//f/9//3//f/9//3//f/9/cIBwgHCAcIBwgHCAcIBwgHCAcIBwgP9//3//f/9//3//f/9//3//f/9/cIBwgHCAcIBwgHCAcIBwgHCAcIBwgP9//3//f/9//3//f/9//3//f/9/cIBwgHCAcIBwgHCAcIBwgHCAcIBwgP9//3//f/9//3//f/9//3//f/9/cIBwgHCAcIBwgHCAcIBwgHCAcIBwgP9//3//f/9//3//f/9//3//f/9/');
      audio.volume = 1.0;
      audio.play().catch(() => console.log('Audio notification blocked by browser'));
    }
  };

  useEffect(() => {
    // Skip first render to avoid notification on page load
    if (isFirstRender.current) {
      isFirstRender.current = false;
      previousOrdersRef.current = orders;
      return;
    }

    const previousOrders = previousOrdersRef.current;
    
    // Find new pending orders (online or takeaway)
    const newOrders = orders.filter((order) => {
      const wasExisting = previousOrders.find((prev) => prev.id === order.id);
      const isNewPending = !wasExisting && 
        order.status === 'pending' && 
        (order.orderType === 'online' || order.orderType === 'takeaway');
      return isNewPending;
    });

    // Play sound and show toast for each new order
    newOrders.forEach((order) => {
      // Play loud notification sound
      playNotificationSound();

      // Show toast notification
      const orderTypeLabel = order.orderType === 'online' ? '🌐 Online Order' : '🛍️ Takeaway Order';
      toast.success(`New ${orderTypeLabel}`, {
        description: `Order ${order.orderNumber} - ${order.customerName || 'Customer'} - Total: ₨ ${order.total.toLocaleString()}`,
        duration: 10000,
        action: {
          label: 'View',
          onClick: () => {
            window.location.href = order.orderType === 'online' ? '/online-orders' : '/takeaway-orders';
          },
        },
      });
    });

    previousOrdersRef.current = orders;
  }, [orders]);

  return { playNotificationSound };
}
