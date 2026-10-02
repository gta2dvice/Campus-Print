import React from 'react';

export function calculatePasswordStrength(password) {
  if (!password) return { score: 0, label: '', checks: {} };

  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password)
  };

  let passedCount = 0;
  if (checks.length) passedCount++;
  if (checks.lowercase && checks.uppercase) passedCount++;
  if (checks.number) passedCount++;
  if (checks.special) passedCount++;

  let label = 'Weak';
  let color = '#ef4444'; // Red
  let widthPercent = 25;

  if (passedCount <= 1) {
    label = 'Weak';
    color = '#ef4444';
    widthPercent = 25;
  } else if (passedCount === 2) {
    label = 'Fair';
    color = '#f97316'; // Orange
    widthPercent = 50;
  } else if (passedCount === 3) {
    label = 'Good';
    color = '#eab308'; // Yellow
    widthPercent = 75;
  } else if (passedCount >= 4) {
    label = 'Strong';
    color = '#22c55e'; // Green
    widthPercent = 100;
  }

  const isStrong = checks.length && checks.lowercase && checks.uppercase && checks.number && checks.special;

  return {
    score: passedCount,
    label,
    color,
    widthPercent,
    checks,
    isStrong
  };
}

export default function PasswordStrengthIndicator({ password }) {
  if (!password) return null;

  const { label, color, widthPercent, checks } = calculatePasswordStrength(password);

  const checkItem = (passed, text) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: passed ? '#16a34a' : '#64748b' }}>
      <span style={{ fontSize: '0.9rem', lineHeight: 1 }}>{passed ? '✓' : '•'}</span>
      <span>{text}</span>
    </div>
  );

  return (
    <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Password strength:</span>
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color }}>{label}</span>
      </div>

      <div style={{ height: '5px', width: '100%', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${widthPercent}%`,
            background: color,
            transition: 'width 0.3s ease, background 0.3s ease',
            borderRadius: '4px'
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem', marginTop: '0.25rem' }}>
        {checkItem(checks.length, 'Min 8 characters')}
        {checkItem(checks.uppercase && checks.lowercase, 'Uppercase & lowercase')}
        {checkItem(checks.number, 'At least 1 number')}
        {checkItem(checks.special, 'At least 1 symbol')}
      </div>
    </div>
  );
}
