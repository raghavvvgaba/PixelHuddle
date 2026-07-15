import React, { useState, useEffect } from 'react';

const PasswordStrengthMeter = ({ password, onStrengthChange }) => {
  const [strength, setStrength] = useState(0);
  const [feedback, setFeedback] = useState([]);

  useEffect(() => {
    if (!password) {
      setStrength(0);
      setFeedback([]);
      onStrengthChange?.(0);
      return;
    }

    let score = 0;
    const newFeedback = [];

    // Length check
    if (password.length >= 8) {
      score += 1;
    } else {
      newFeedback.push('At least 8 characters');
    }

    // Uppercase letter
    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      newFeedback.push('One uppercase letter');
    }

    // Lowercase letter
    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      newFeedback.push('One lowercase letter');
    }

    // Number
    if (/\d/.test(password)) {
      score += 1;
    } else {
      newFeedback.push('One number');
    }

    // Special character
    if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      score += 1;
    } else {
      newFeedback.push('One special character');
    }

    // Bonus for longer passwords
    if (password.length >= 12) {
      score += 1;
    }

    setStrength(score);
    setFeedback(newFeedback);
    onStrengthChange?.(score);
  }, [password, onStrengthChange]);

  const getStrengthColor = () => {
    if (strength <= 2) return 'bg-red-500';
    if (strength <= 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthText = () => {
    if (strength <= 2) return 'Weak';
    if (strength <= 4) return 'Medium';
    return 'Strong';
  };

  const getStrengthTextColor = () => {
    if (strength <= 2) return 'text-red-500';
    if (strength <= 4) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Password Strength</span>
        <span className={`text-sm font-medium ${getStrengthTextColor()}`}>
          {getStrengthText()}
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor()}`}
          style={{ width: `${(strength / 6) * 100}%` }}
        />
      </div>

      {feedback.length > 0 && (
        <div className="mt-2">
          <p className="text-sm text-gray-600 mb-1">Password must contain:</p>
          <ul className="text-xs space-y-1">
            {feedback.map((item, index) => (
              <li key={index} className="flex items-center text-gray-500">
                <svg className="w-3 h-3 mr-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
                  <path d="M10 6v4l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {strength >= 5 && (
        <div className="flex items-center text-green-600 text-sm">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Strong password!
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthMeter;
