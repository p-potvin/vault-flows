import React from 'react';
import { useVaultTheme } from '../../lib/vaultTheme';

export function VaultwaresBranding() {
  const { theme } = useVaultTheme();
  return (
    <div className="flex items-center space-x-2 mb-6" style={{ color: theme.accent }}>
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill={theme.primary} />
        <path d="M8 16C8 11.58 11.58 8 16 8C20.42 8 24 11.58 24 16C24 20.42 20.42 24 16 24C11.58 24 8 20.42 8 16Z" fill={theme.accent} />
        <text x="16" y="21" textAnchor="middle" fontSize="10" fill={theme.primary} fontFamily="monospace">VW</text>
      </svg>
      <span className="font-bold text-xl tracking-tight" style={{ color: theme.accent }}>
        Vaultwares
      </span>
    </div>
  );
}
