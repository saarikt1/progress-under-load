"use client";

import { useEffect } from "react";

export function PwaRegister() {
    useEffect(() => {
        if (
            typeof window !== "undefined" &&
            "serviceWorker" in navigator &&
            // Disable in development if needed, but good to test.
            // Usually you don't want it interfering, but we keep it simple.
            process.env.NODE_ENV === "production"
        ) {
            navigator.serviceWorker
                .register("/service-worker.js")
                .then((registration) => {
                    console.log(
                        "Service Worker registration successful with scope: ",
                        registration.scope
                    );
                })
                .catch((err) => {
                    console.error("Service Worker registration failed: ", err);
                });
        }
    }, []);

    return null; // This component doesn't render anything
}
