import { InputHTMLAttributes, useState } from 'react'
import { EyeIcon, EyeOffIcon } from './Icons'

export interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  wrapperStyle?: React.CSSProperties
  wrapperClassName?: string
}

export default function PasswordInput({
  className = '',
  style,
  wrapperStyle,
  wrapperClassName = '',
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div
      className={`password-input-wrapper ${wrapperClassName}`}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        ...wrapperStyle,
      }}
    >
      <input
        {...props}
        type={showPassword ? 'text' : 'password'}
        className={`password-input-field ${className}`}
        style={{
          width: '100%',
          paddingRight: '2.5rem',
          ...style,
        }}
      />
      <button
        type="button"
        tabIndex={-1}
        className="password-toggle-btn"
        onClick={() => setShowPassword((prev) => !prev)}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        title={showPassword ? 'Hide password' : 'Show password'}
        style={{
          position: 'absolute',
          right: '0.65rem',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '0.25rem',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6c757d',
          borderRadius: '4px',
          transition: 'color 0.15s ease',
        }}
      >
        {showPassword ? (
          <EyeOffIcon className="password-eye-icon" />
        ) : (
          <EyeIcon className="password-eye-icon" />
        )}
      </button>
    </div>
  )
}
