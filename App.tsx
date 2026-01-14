import React, { useState, useEffect } from 'react';
import { AppView, BusinessProfile, IndustryType } from './types';
import Onboarding from './components/Onboarding';
import BusinessDashboard from './components/BusinessDashboard';
import CustomerView from './components/CustomerView';
import LandingPage from './components/LandingPage';
import PricingPage from './components/PricingPage';
import { AlertTriangle } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.LANDING);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  
  // Debug/Error State for Customer Link Issues
  const [linkError, setLinkError] = useState<string | null>(null);
  const [rawHash, setRawHash] = useState<string>('');

  // Handle URL Hash for simulated routing (Customer View vs Business View)
  useEffect(() => {
    // 1. Check for Payment Success Return (e.g. ?payment=success)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      // If user returns from payment link, go directly to Onboarding
      setView(AppView.ONBOARDING);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
      return; 
    }

    // 2. Hash Routing Logic
    const handleHashChange = () => {
      const hash = window.location.hash;
      setRawHash(hash);
      
      // Reset error state on new hash
      setLinkError(null);

      if (hash.startsWith('#customer')) {
        // Parse params from hash like #customer?name=X&industry=Y&url=Z
        try {
          // Robust parsing: Handle cases where the hash might be encoded or malformed
          const parts = hash.split('?');
          if (parts.length < 2) {
             throw new Error("파라미터가 없습니다 (? 없음)");
          }

          const queryString = parts[1];
          const params = new URLSearchParams(queryString);
          
          const name = params.get('name');
          const industry = params.get('industry') as IndustryType;
          const url = params.get('url');

          if (name && industry && url) {
            setBusiness({
              name: name, 
              industry: industry,
              placeUrl: url
            });
            setView(AppView.CUSTOMER_VIEW);
          } else {
             // Specific missing fields
             const missing = [];
             if (!name) missing.push('상호명(name)');
             if (!industry) missing.push('업종(industry)');
             if (!url) missing.push('주소(url)');
             throw new Error(`필수 정보 누락: ${missing.join(', ')}`);
          }
        } catch (e: any) {
          console.error("Link Parsing Error:", e);
          setLinkError(e.message || "알 수 없는 오류");
          // Do NOT redirect to landing, show error screen instead
          setView(AppView.CUSTOMER_VIEW); // We will handle the error display inside the render block or here
        }
      } else {
        // Check if we have saved business state (in local storage for persistence)
        const saved = localStorage.getItem('easyReview_biz');
        if (saved) {
           setBusiness(JSON.parse(saved));
           if (view === AppView.LANDING || view === AppView.ONBOARDING) {
             setView(AppView.DASHBOARD);
           }
        } else {
           if (view === AppView.LANDING) {
             setView(AppView.LANDING);
           }
        }
      }
    };

    // Initial check
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []); // Run once on mount

  const handleStart = () => {
    setView(AppView.PRICING);
  };

  const handlePlanSelect = (plan: string) => {
    console.log(`User selected plan: ${plan}`);
    setView(AppView.ONBOARDING);
  };

  const handleBusinessSetup = (profile: BusinessProfile) => {
    setBusiness(profile);
    localStorage.setItem('easyReview_biz', JSON.stringify(profile));
    setView(AppView.DASHBOARD);
  };

  const handleEditProfile = () => {
    setView(AppView.ONBOARDING);
  };

  // ERROR VIEW (If link parsing failed)
  if (view === AppView.CUSTOMER_VIEW && linkError) {
      return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
              <div className="bg-white rounded-2xl p-8 shadow-xl max-w-sm w-full text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                      <AlertTriangle size={32} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">링크 정보 오류</h2>
                  <p className="text-gray-600 text-sm mb-6">
                      QR코드에 담긴 정보가 손상되었거나 형식이 올바르지 않습니다.
                  </p>
                  <div className="bg-gray-100 p-3 rounded-lg text-left mb-6 overflow-hidden">
                      <p className="text-xs font-bold text-gray-500 mb-1">오류 내용:</p>
                      <p className="text-xs text-red-600 font-mono mb-2">{linkError}</p>
                      <p className="text-xs font-bold text-gray-500 mb-1">수신된 데이터:</p>
                      <p className="text-[10px] text-gray-400 font-mono break-all">{rawHash}</p>
                  </div>
                  <button 
                      onClick={() => setView(AppView.LANDING)}
                      className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold text-sm"
                  >
                      홈으로 이동
                  </button>
              </div>
          </div>
      );
  }

  // Render Logic
  if (view === AppView.CUSTOMER_VIEW && business) {
    return (
      <CustomerView 
        business={business} 
        onBack={window.location.hash.startsWith('#customer') ? undefined : () => setView(AppView.DASHBOARD)} 
      />
    );
  }

  if (view === AppView.DASHBOARD && business) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-6 py-4 mb-6 sticky top-0 z-10 hidden md:block">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <span className="font-bold text-xl tracking-tight text-gray-900">Easy<span className="text-blue-600">Review</span></span>
            <div className="text-xs text-gray-400">사장님 전용</div>
          </div>
        </header>
        <BusinessDashboard 
          business={business} 
          setAppView={setView} 
          onEditProfile={handleEditProfile}
        />
      </div>
    );
  }

  if (view === AppView.PRICING) {
    return (
      <PricingPage 
        onSelectPlan={handlePlanSelect} 
        onBack={() => setView(AppView.LANDING)}
      />
    );
  }

  if (view === AppView.ONBOARDING) {
    return <Onboarding onComplete={handleBusinessSetup} />;
  }

  // Default to Landing Page
  return <LandingPage onStart={handleStart} />;
};

export default App;
