import React from 'react';
import PageBackground from './PageBackground';
import Footer from './Footer';

export default function Layout({ children, header }) {
    return (
        <>
            <PageBackground />
            <div className="page-content">
                {header}
                <main>
                    {children}
                </main>
                <Footer />
            </div>
        </>
    );
}
