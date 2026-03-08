import { useState, useRef, useEffect } from 'react';
import { X, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CalculatorModal({ isOpen, onClose }: CalculatorModalProps) {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  
  // Draggable state
  const [position, setPosition] = useState({ x: window.innerWidth / 2 - 160, y: window.innerHeight / 2 - 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.calc-header')) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: Math.max(0, Math.min(window.innerWidth - 320, e.clientX - dragOffset.x)),
          y: Math.max(0, Math.min(window.innerHeight - 400, e.clientY - dragOffset.y)),
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const inputNumber = (num: string) => {
    if (waitingForOperand) {
      setDisplay(num);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? num : display + num);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const clear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const performOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue;
      let result: number;

      switch (operation) {
        case '+':
          result = currentValue + inputValue;
          break;
        case '-':
          result = currentValue - inputValue;
          break;
        case '×':
          result = currentValue * inputValue;
          break;
        case '÷':
          result = currentValue / inputValue;
          break;
        case '%':
          result = currentValue % inputValue;
          break;
        default:
          result = inputValue;
      }

      setDisplay(String(result));
      setPreviousValue(result);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const calculate = () => {
    if (!operation || previousValue === null) return;

    const inputValue = parseFloat(display);
    let result: number;

    switch (operation) {
      case '+':
        result = previousValue + inputValue;
        break;
      case '-':
        result = previousValue - inputValue;
        break;
      case '×':
        result = previousValue * inputValue;
        break;
      case '÷':
        result = previousValue / inputValue;
        break;
      case '%':
        result = previousValue % inputValue;
        break;
      default:
        result = inputValue;
    }

    setDisplay(String(result));
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(true);
  };

  const toggleSign = () => {
    setDisplay(String(parseFloat(display) * -1));
  };

  const percentage = () => {
    setDisplay(String(parseFloat(display) / 100));
  };

  if (!isOpen) return null;

  const buttons = [
    { label: 'AC', action: clear, className: 'bg-muted text-muted-foreground' },
    { label: '±', action: toggleSign, className: 'bg-muted text-muted-foreground' },
    { label: '%', action: percentage, className: 'bg-muted text-muted-foreground' },
    { label: '÷', action: () => performOperation('÷'), className: 'bg-primary text-primary-foreground' },
    { label: '7', action: () => inputNumber('7'), className: 'bg-card hover:bg-accent' },
    { label: '8', action: () => inputNumber('8'), className: 'bg-card hover:bg-accent' },
    { label: '9', action: () => inputNumber('9'), className: 'bg-card hover:bg-accent' },
    { label: '×', action: () => performOperation('×'), className: 'bg-primary text-primary-foreground' },
    { label: '4', action: () => inputNumber('4'), className: 'bg-card hover:bg-accent' },
    { label: '5', action: () => inputNumber('5'), className: 'bg-card hover:bg-accent' },
    { label: '6', action: () => inputNumber('6'), className: 'bg-card hover:bg-accent' },
    { label: '-', action: () => performOperation('-'), className: 'bg-primary text-primary-foreground' },
    { label: '1', action: () => inputNumber('1'), className: 'bg-card hover:bg-accent' },
    { label: '2', action: () => inputNumber('2'), className: 'bg-card hover:bg-accent' },
    { label: '3', action: () => inputNumber('3'), className: 'bg-card hover:bg-accent' },
    { label: '+', action: () => performOperation('+'), className: 'bg-primary text-primary-foreground' },
    { label: '0', action: () => inputNumber('0'), className: 'bg-card hover:bg-accent col-span-2' },
    { label: '.', action: inputDecimal, className: 'bg-card hover:bg-accent' },
    { label: '=', action: calculate, className: 'bg-primary text-primary-foreground' },
  ];

  return (
    <div
      ref={modalRef}
      className="fixed z-50 shadow-2xl rounded-xl overflow-hidden border border-border bg-background"
      style={{
        left: position.x,
        top: position.y,
        width: 320,
        cursor: isDragging ? 'grabbing' : 'auto',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header - Draggable */}
      <div className="calc-header flex items-center justify-between p-3 bg-muted cursor-grab select-none">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <span className="font-medium text-sm">Calculator</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Display */}
      <div className="p-4 bg-muted/50">
        <div className="text-right text-3xl font-mono font-bold text-foreground truncate">
          {display}
        </div>
        {operation && previousValue !== null && (
          <div className="text-right text-sm text-muted-foreground">
            {previousValue} {operation}
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-4 gap-1 p-2 bg-background">
        {buttons.map((btn, index) => (
          <button
            key={index}
            onClick={btn.action}
            className={cn(
              'h-14 rounded-lg text-lg font-medium transition-all active:scale-95',
              btn.className
            )}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}
