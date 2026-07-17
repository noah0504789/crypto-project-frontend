import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './LoadingButton.css';

type LoadingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading: boolean;
  loadingText?: string;
  children: ReactNode;
};

export default function LoadingButton({
  isLoading,
  loadingText = '처리 중...',
  children,
  disabled,
  className = '',
  ...props
}: LoadingButtonProps) {
  return (
    <button
      type="button"
      className={`loading-button ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="loading-button-spinner" />
          <span>{loadingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}