import React, { useState, useEffect } from "react";

const ConnectionStatusIndicator: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isPoorConnection, setIsPoorConnection] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Check connection type when coming online
      checkConnectionType();
    };

    const handleOffline = () => {
      setIsOffline(true);
      setIsPoorConnection(false);
    };

    const handleConnectionChange = () => {
      if (!isOffline) {
        checkConnectionType();
      }
    };

    const checkConnectionType = () => {
      if ("connection" in navigator && navigator.connection) {
        const effectiveType = navigator.connection.effectiveType;
        setIsPoorConnection(effectiveType === "slow-2g" || effectiveType === "2g");
      } else {
        setIsPoorConnection(false);
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    if ("connection" in navigator && navigator.connection) {
      navigator.connection.addEventListener("change", handleConnectionChange);
      // Initial check
      checkConnectionType();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if ("connection" in navigator && navigator.connection) {
        navigator.connection.removeEventListener("change", handleConnectionChange);
      }
    };
  }, [isOffline]);

  if (isOffline) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div className="relative">
          {/* Main content */}
          <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-8 text-center bg-white/90 backdrop-blur-sm">
            {/* Cloud icon */}
            <div className="relative inline-block mb-8">
              <div className="inline-block">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5a3 3 0 00-2.83 1.17A5.972 5.972 0 005 19a6 6 0 0011.54-2h.31c.52 0 1.03.17 1.44.45A3 3 0 0018 18.03V11zm0 0h.01M19 11a6.006 6.006 0 01-4 5.659v1.341a3 3 0 01-3 3H9a3 3 0 01-2.83-.99a5.972 5.972 0 012.83-5.16A5.972 5.972 0 009 11h10z" />
                </svg>
              </div>
              
              {/* Offline badge */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white px-3 py-1 rounded-full shadow-lg border-2 border-[#0B4A82]">
                <span className="text-xs font-medium text-gray-800">OFFLINE</span>
              </div>
            </div>
            
            {/* Message */}
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              You're Offline
            </h2>
            <p className="text-base text-gray-600 mb-6 max-w-xl">
              It looks like you're not connected to the internet. Please check your connection and try again to access School Manager.
            </p>
            
            {/* Action button */}
            <button
              onClick={() => window.location.reload()}
              className="bg-[#0B4A82] hover:bg-[#083a66] text-white font-semibold py-3 px-8 rounded-lg shadow-md transition-all duration-200 transform hover:-translate-y-1 hover:shadow-lg"
            >
              <span className="inline-flex items-center">
                <span className="mr-2">🔄</span>
                Try Again
              </span>
            </button>
            
            {/* Tip */}
            <p className="mt-6 text-sm text-gray-500">
              While you're offline, you can still view previously loaded pages, but some features may not work until you're back online.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isPoorConnection) {
    return (
      <div className="fixed bottom-4 left-0 right-0 z-40 flex items-center justify-center px-4 pointer-events-none">
        <div className="relative">
          {/* Background */}
          <div className="absolute inset-0 bg-amber-50/80 backdrop-blur-sm rounded-2xl border border-amber-200/50"></div>
          
          {/* Content */}
          <div className="relative z-10 flex items-center gap-3 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-2xl border border-amber-200/50 shadow-lg">
            {/* Icon */}
            <div className="flex-shrink-0">
              <div className="inline-flex h-8 w-8 items-center justify-center bg-amber-100 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2v-4a2 2 0 00-2-2H8a2 2 0 00-2 2v4a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            
            {/* Text */}
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">
                You're on a slow connection
              </p>
              <p className="text-xs text-amber-600">
                Some features may be slow or temporarily unavailable
              </p>
            </div>
            
            {/* Refresh button */}
            <button
              onClick={() => window.location.reload()}
              className="flex-shrink-0 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-full p-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-11.016-2m0 0A8.005 8.005 0 0019.418 11M15 9l2 2m0 0l-2 2m2 2H7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default ConnectionStatusIndicator;