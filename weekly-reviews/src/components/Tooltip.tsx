"use client";

import { useState } from 'react';

interface TooltipProps {
    title: string;
    children: React.ReactNode;
}

export default function Tooltip({ title, children }: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div
            style={{ position: 'relative', display: 'inline-flex', marginLeft: '6px', cursor: 'help' }}
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
            onClick={() => setIsVisible(!isVisible)} // Mobile friendly toggle
        >
            {/* Icon */}
            <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ color: '#9CA3AF' }} // text-gray-400
            >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>

            {/* Tooltip Content */}
            {isVisible && (
                <div style={{
                    position: 'absolute',
                    bottom: '125%', // Above the icon
                    left: '50%',
                    transform: 'translateX(-15%)', // Slight offset adjustment
                    width: '280px',
                    backgroundColor: '#1F2937', // Dark gray
                    color: '#FFFFFF',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    lineHeight: '1.4',
                    zIndex: 50,
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    textAlign: 'left'
                }}>
                    <div style={{ fontWeight: 600, marginBottom: '4px', fontSize: '0.9rem' }}>{title}</div>
                    <div style={{ color: '#D1D5DB' }}>{children}</div>

                    {/* Arrow */}
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: '15%', // Matches transform offset roughly
                        marginLeft: '-5px',
                        borderWidth: '5px',
                        borderStyle: 'solid',
                        borderColor: '#1F2937 transparent transparent transparent'
                    }} />
                </div>
            )}
        </div>
    );
}
