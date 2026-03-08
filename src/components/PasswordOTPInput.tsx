import * as React from 'react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { cn } from '@/lib/utils';

interface PasswordOTPInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  error?: boolean;
  className?: string;
}

export function PasswordOTPInput({
  value,
  onChange,
  length = 5,
  error = false,
  className,
}: PasswordOTPInputProps) {
  return (
    <div className={cn('flex justify-center', className)}>
      <InputOTP
        maxLength={length}
        value={value}
        onChange={onChange}
        containerClassName={cn(
          error && '[&>div]:border-destructive'
        )}
      >
        <InputOTPGroup>
          {Array.from({ length }, (_, index) => (
            <InputOTPSlot
              key={index}
              index={index}
              className={cn(
                'h-12 w-12 text-lg font-semibold',
                error && 'border-destructive ring-destructive'
              )}
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </div>
  );
}
