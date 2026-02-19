"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
    const pathname = usePathname();

    const linkStyle = (active: boolean) => ({
        fontSize: '0.9rem',
        fontWeight: active ? 600 : 400,
        color: active ? '#000' : '#6B7280',
        padding: '8px 12px',
        borderRadius: '8px',
        background: active ? '#F3F4F6' : 'transparent',
        transition: 'all 0.2s ease'
    });

    return (
        <nav style={{
            // Fixed Positioning (Pinned)
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,

            // Visuals
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '16px',
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(0,0,0,0.05)',
        }}>
            {/* Inner Container for max-width if needed, but centering links is simple here */}
            <div style={{ display: 'flex', gap: '8px' }}>
                <Link href="/" style={linkStyle(pathname === '/')}>
                    Dashboard
                </Link>
                <Link href="/review" style={linkStyle(pathname === '/review' || pathname?.startsWith('/review'))}>
                    Review
                </Link>
            </div>
        </nav>
    );
}
