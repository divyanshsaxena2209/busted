import React, { useState, useEffect } from 'react';
import { Background } from './components/Background';
import { Header } from './components/Header';
import { NewsTicker } from './components/NewsTicker';
import { HomeActions } from './components/HomeActions';
import { InfoSection } from './components/InfoSection';
import { LoginForm } from './components/LoginForm';
import { SignupForm } from './components/SignupForm';
import { ReportIssue } from './components/ReportIssue';
import { ReportHistory } from './components/ReportHistory';
import { UploadEvidence } from './components/UploadEvidence';
import { ComplaintPreview } from './components/ComplaintPreview';
import { ViewState, User, ActivityItem } from './types';
import { 
  LogOut, 
  AlertTriangle, 
  FileText, 
  ExternalLink,
  Megaphone,
  Cone,
  Upload
} from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>(() => {
    // Read from URL directly so normal refreshes stay on the same page
    const currentParams = new URLSearchParams(window.location.search);
    const viewParam = currentParams.get('view') as ViewState;
    // Default to 'home' if no specific view is requested in the URL
    return viewParam || 'home';
  });
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('busted_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [evidenceData, setEvidenceData] = useState<any>(null);
  
  useEffect(() => {
    // Keep URL in sync with view for browser back button support
    const currentParams = new URLSearchParams(window.location.search);
    if (currentParams.get('view') !== currentView) {
      // If we are navigating back to home, clean the URL
      if (currentView === 'home') {
        window.history.pushState({ view: currentView }, '', '/');
      } else {
        window.history.pushState({ view: currentView }, '', `?view=${currentView}`);
      }
    }
  }, [currentView]);

  useEffect(() => {
    // Listen for browser back/forward buttons
    const handlePopState = (event: PopStateEvent) => {
      const currentParams = new URLSearchParams(window.location.search);
      const view = currentParams.get('view') as ViewState | null;
      if (view) {
         setCurrentView(view);
      } else {
         setCurrentView('home');
      }
    };
    
    // Set initial state for history if missing
    if (!window.location.search) {
       window.history.replaceState({ view: currentView }, '', `?view=${currentView}`);
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('busted_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('busted_user');
    }
  }, [user]);
  
  // 1. Activity State
  const [activity, setActivity] = useState<ActivityItem[]>([
    { 
      id: 1,
      type: 'Traffic',
      title: 'DL-3C-AB-1234 — Red Light Jump', 
      status: 'Pending', 
      time: '10 mins ago',
      ticketId: 'BST-TRF-1001'
    },
    { 
      id: 2,
      type: 'Traffic',
      title: 'MH-02-XY-9999 — Wrong Side Driving', 
      status: 'Verified', 
      time: '3 hours ago',
      ticketId: 'BST-TRF-1002'
    },
    { 
      id: 3,
      type: 'Civic',
      title: 'Pothole detected at Sector 18', 
      status: 'Resolved', 
      time: '1 day ago',
      ticketId: 'BST-CIV-1003'
    },
  ]);

  useEffect(() => {
    if (user && !user.isGuest && user.id) {
      fetch(`/api/reports/history/${user.id}`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch history');
          return res.json();
        })
        .then((data: any[]) => {
          if (data && data.length > 0) {
            const mappedActivity: ActivityItem[] = data.map(item => ({
              id: item.report_id,
              type: item.issue_type ? 'Civic' : 'Traffic',
              title: item.issue_type 
                ? `${item.issue_type} at ${item.formatted_address?.substring(0, 20)}...` 
                : (item.message_preview?.split('\n')[2]?.replace('Vehicle: ', '') || 'Traffic Violation'),
              status: item.status === 'draft_redirected' ? 'Pending' : 'Pending', // Default to Pending for now
              time: new Date(item.timestamp).toLocaleString(),
              ticketId: item.report_id
            }));
            setActivity(mappedActivity);
          }
        })
        .catch(err => console.error('Error fetching history:', err));
    }
  }, [user]);

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    setCurrentView('dashboard');
  };

  const handleGuestAccess = () => {
    setUser({
      name: 'Guest',
      email: '',
      isGuest: true
    });
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView('home');
  };

  const handleReportSuccess = (newReport: any) => {
    if (user?.isGuest) {
       // Intercept the submission for guests
       setCurrentView('guest-success');
       return;
    }
    // Ensure civic reports get the type 'Civic'
    const reportWithType = { ...newReport, type: newReport.type || 'Civic' };
    setActivity(prev => [reportWithType, ...prev]);
    setCurrentView('history');
  };

  const handleEvidenceAnalysisComplete = (data: any) => {
    setEvidenceData(data);
    setCurrentView('complaint-preview');
  };

  const handleComplaintSubmit = () => {
    // Add the AI complaint to activity history with 'Traffic' type
    const newReport: ActivityItem = {
      id: `AI-${Math.floor(Math.random() * 10000)}`,
      type: 'Traffic',
      title: `${evidenceData.violation} (${evidenceData.plate})`,
      status: 'Verified',
      time: 'Just now',
      ticketId: `BST-AI-${Math.floor(Math.random() * 9000) + 1000}`
    };
    handleReportSuccess(newReport);
  };

  // 2. Separate Data for Traffic News
  const [trafficNews, setTrafficNews] = useState<any[]>([
    { 
      id: 'loading',
      title: 'Fetching latest local alerts...', 
      meta: 'System • Just now',
      link: '#',
      isUrgent: false
    }
  ]);

  useEffect(() => {
    // Only fetch when on dashboard to prevent unnecessary API calls
    if (currentView !== 'dashboard') return;

    const fetchDashboardNews = async () => {
      try {
        const endpoint = (user && !user.isGuest && user.id) ? `/api/news/local?userId=${user.id}` : '/api/news';
        const res = await fetch(endpoint, { cache: 'no-store' });
        if (!res.ok) throw new Error('API failed');
        const data = await res.json();
        
        if (data.items && Array.isArray(data.items) && data.items.length > 0) {
          const mapped = data.items.slice(0, 4).map((item: any, idx: number) => ({
            id: `news-${idx}`,
            title: item.title,
            meta: `${item.source} • ${item.timeAgo}`,
            link: item.url !== '#' ? item.url : undefined,
            isUrgent: item.category === 'accident' || item.category === 'traffic' || item.category === 'road safety'
          }));
          setTrafficNews(mapped);
        } else {
          setTrafficNews([{ 
            id: 'empty', title: 'No recent updates in your area.', meta: 'System • Updates paused', link: '#', isUrgent: false 
          }]);
        }
      } catch (err) {
        console.error('Error fetching dashboard news:', err);
        setTrafficNews([{ 
          id: 'error', title: 'Unable to connect to news provider.', meta: 'System Error', link: '#', isUrgent: true 
        }]);
      }
    };

    fetchDashboardNews();
  }, [user, currentView]);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden flex flex-col font-sans text-white">
      {/* Background Switching: Original Background for all views */}
      <Background />
      
      {/* Scrolling Window - Global Visibility */}
      <div className="relative z-20 w-full shadow-lg bg-black/20">
        <NewsTicker />
      </div>
      
      <main className="relative z-10 flex-grow flex flex-col items-center w-full px-4 md:px-8 py-6">
        
        {/* Main Content Area */}
        <div className="w-full flex flex-col max-w-7xl mx-auto">
          
          {/* Top Navbar */}
          {(currentView === 'home' || currentView === 'login' || currentView === 'signup') && (
            <nav className="w-full flex items-center justify-between mb-24 relative z-30 py-4">
               <Header />
               {currentView === 'home' && (
                 <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                   <HomeActions 
                     onLogin={() => setCurrentView('login')} 
                     onGuest={handleGuestAccess} 
                   />
                 </div>
               )}
            </nav>
          )}

          {/* VIEW: HOME */}
          {currentView === 'home' && (
            <div className="w-full relative flex flex-col space-y-0 animate-in fade-in slide-in-from-bottom-10 duration-700">
              <div className="w-full relative z-10">
                <InfoSection />
              </div>
            </div>
          )}

          {/* VIEW: LOGIN */}
          {currentView === 'login' && (
            <div className="w-full mt-4">
              <LoginForm 
                onLoginSuccess={handleLoginSuccess}
                onSwitchToSignup={() => setCurrentView('signup')}
                onBack={() => setCurrentView('home')}
              />
            </div>
          )}

          {/* VIEW: SIGNUP */}
          {currentView === 'signup' && (
            <div className="w-full mt-4">
               <SignupForm 
                 onSignupSuccess={(newUser) => {
                   setUser(newUser);
                   setCurrentView('dashboard');
                 }}
                 onSwitchToLogin={() => setCurrentView('login')}
                 onBack={() => setCurrentView('home')}
               />
            </div>
          )}

          {/* INTERNAL VIEWS WRAPPER: DASHBOARD, REPORT, HISTORY, UPLOAD, PREVIEW */}
          {(currentView === 'dashboard' || currentView === 'report-issue' || currentView === 'history' || currentView === 'upload-evidence' || currentView === 'complaint-preview') && (
            <div className="w-full relative animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Shared Top Header for Internal Views */}
               <div className="px-6 md:px-12 mb-12 flex justify-between items-start relative z-20">
                  {/* Only show 'Welcome' on Dashboard, otherwise breadcrumb/back logic handled in components */}
                  {currentView === 'dashboard' ? (
                    <div className="flex flex-col gap-2">
                       {!user?.isGuest ? (
                         <>
                           <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                             Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-100">{user?.name || 'User'}</span>
                           </h1>
                           
                           {/* Trust Badge Strip - Only show if NOT Guest */}
                           <div className="flex flex-wrap items-center gap-6 text-sm mt-1">
                               <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-400 font-medium">
                                 <span>Verified Reporter</span>
                               </div>
                               <span className="text-blue-200/60 flex items-center gap-1.5">
                                 Level 2 Contributor
                               </span>
                               <span className="text-blue-200/60">
                                 Trust Score: <span className="text-white font-semibold">87%</span>
                               </span>
                           </div>
                         </>
                       ) : (
                         <div className="flex flex-col items-start gap-4">
                           <div className="flex items-center gap-3">
                              <span className="px-2 py-1 text-[10px] font-bold tracking-widest text-[#870000] bg-[#870000]/10 border border-[#870000]/30 rounded uppercase">Guest Mode</span>
                              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Action Menu</h1>
                           </div>
                           <p className="text-gray-400 text-sm max-w-md">You are using a temporary session. <button onClick={() => setCurrentView('signup')} className="text-blue-400 hover:text-blue-300 underline underline-offset-2 font-medium transition-colors">Sign up</button> to save reports and track history.</p>
                         </div>
                       )}
                    </div>
                  ) : (
                    /* Placeholder for layout balance if needed, or empty */
                    <div />
                  )}
                 
                 <button 
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 text-sm rounded-full transition-all group backdrop-blur-sm"
                  >
                    <LogOut className="w-4 h-4 group-hover:text-red-400 transition-colors" />
                    <span>Logout</span>
                  </button>
              </div>

              {/* VIEW: DASHBOARD */}
              {currentView === 'dashboard' && (
                <div className="w-full px-6 md:px-12 pb-20 relative z-10">
                  
                  {/* Stats Strip - Only show if NOT Guest */}
                  {!user?.isGuest && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mb-20 relative z-10">
                      {[
                        { label: 'Reports Submitted', value: '12' },
                        { label: 'Verified Reports', value: '9', color: 'text-green-400' },
                        { label: 'Pending Review', value: '2', color: 'text-yellow-400' },
                      ].map((stat, idx) => (
                        <div key={idx} className="flex flex-col justify-center">
                          <span className="text-white/40 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                            {stat.label}
                          </span>
                          <span className={`text-5xl font-bold tracking-tight ${stat.color || 'text-white'}`}>{stat.value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions Section */}
                  <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 mb-24 relative z-10 ${user?.isGuest ? 'mt-8' : ''}`}>
                    {/* Report Civic Issue */}
                    <button 
                      onClick={() => setCurrentView('report-issue')}
                      className="group relative overflow-hidden rounded-2xl p-8 text-left transition-all duration-300 bg-white/[0.03] hover:bg-white/[0.06] hover:shadow-[0_0_30px_rgba(59,130,246,0.1)]"
                    >
                        <div className="relative z-10 flex flex-row items-center justify-between">
                            <div>
                              <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">Report Civic Issue</h3>
                              <p className="text-white/40 text-sm font-medium">Potholes, broken street lights, road hazards, public safety issues, etc.</p>
                            </div>
                            <div className="p-4 bg-blue-500/10 rounded-2xl group-hover:bg-blue-500/20 group-hover:scale-110 transition-all duration-300">
                              <Cone className="w-8 h-8 text-blue-400" />
                            </div>
                        </div>
                    </button>

                    {/* Upload Evidence */}
                    <button 
                      onClick={() => setCurrentView('upload-evidence')}
                      className="group relative overflow-hidden rounded-2xl p-8 text-left transition-all duration-300 bg-white/[0.03] hover:bg-white/[0.06] hover:shadow-[0_0_30px_rgba(239,68,68,0.1)]"
                    >
                        <div className="relative z-10 flex flex-row items-center justify-between">
                            <div>
                              <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-red-300 transition-colors">Upload Evidence</h3>
                              <p className="text-white/40 text-sm font-medium">Traffic violations, AI Analysis, Generate Complaints</p>
                            </div>
                            <div className="p-4 bg-red-500/10 rounded-2xl group-hover:bg-red-500/20 group-hover:scale-110 transition-all duration-300">
                              <Upload className="w-8 h-8 text-red-400" />
                            </div>
                        </div>
                    </button>
                  </div>

                  {/* Split Content Sections */}
                  {/* If Guest: Single column (updates take full width). If Login: Two columns. */}
                  <div className={`grid grid-cols-1 ${!user?.isGuest ? 'xl:grid-cols-2' : ''} gap-16 xl:gap-24 relative z-10`}>
                    
                    {/* Section 1: Recent Activity - Only show if NOT Guest */}
                    {!user?.isGuest && (
                      <div className="flex flex-col">
                          <div className="flex items-center gap-3 mb-8 cursor-pointer" onClick={() => setCurrentView('history')}>
                              <h3 className="text-xl font-bold text-white tracking-wide hover:text-blue-300 transition-colors">Recent Activity →</h3>
                          </div>
                          
                          <div className="flex flex-col w-full gap-4">
                            {activity.slice(0, 3).map((item) => (
                                <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between py-4 px-4 -mx-4 hover:bg-white/[0.03] rounded-xl transition-colors group cursor-default">
                                  <div className="flex items-start gap-4 mb-2 md:mb-0">
                                      <div className={`mt-1 p-2 rounded-lg ${item.type === 'Traffic' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'} group-hover:text-white transition-colors`}>
                                        {item.type === 'Traffic' ? <AlertTriangle className="w-4 h-4" /> : <Cone className="w-4 h-4" />}
                                      </div>
                                      <div>
                                        <p className="text-white/90 font-semibold group-hover:text-white transition-colors">{item.title}</p>
                                        <p className="text-xs text-white/30 mt-1 font-medium">{item.ticketId || `Report #${item.id}`}</p>
                                      </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-6 pl-12 md:pl-0">
                                      <div className={`text-xs px-2.5 py-1 rounded-md font-bold tracking-wide ${
                                        item.status === 'Verified' ? 'bg-green-500/10 text-green-400' :
                                        item.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-400' :
                                        item.status === 'Resolved' ? 'bg-blue-500/10 text-blue-400' :
                                        'bg-red-500/10 text-red-400'
                                      }`}>
                                        {item.status}
                                      </div>
                                      <span className="text-xs text-white/30 font-medium min-w-[80px] text-right">{item.time}</span>
                                  </div>
                                </div>
                            ))}
                          </div>
                      </div>
                    )}

                    {/* Section 2: Traffic Police Updates - Only show if NOT Guest */}
                    {!user?.isGuest && (
                      <div className="flex flex-col w-full">
                          <div className="flex items-center gap-3 mb-8">
                              <h3 className="text-xl font-bold text-white tracking-wide">Traffic Police Updates</h3>
                          </div>
                          
                          <div className="flex flex-col w-full gap-4">
                            {trafficNews.map((item) => (
                                <a 
                                  key={item.id} 
                                  href={item.link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex flex-col md:flex-row md:items-center justify-between py-4 px-4 -mx-4 hover:bg-white/[0.04] rounded-xl transition-all group cursor-pointer"
                                >
                                  <div className="flex items-start gap-4 mb-2 md:mb-0">
                                      <div className={`mt-1 p-2 rounded-lg ${item.isUrgent ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                        {item.isUrgent ? <AlertTriangle className="w-4 h-4" /> : <Megaphone className="w-4 h-4" />}
                                      </div>
                                      <div>
                                        <h4 className="text-white font-bold group-hover:text-blue-300 transition-colors flex items-center gap-2 text-sm md:text-base leading-snug">
                                          {item.title}
                                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-400 hidden md:block" />
                                        </h4>
                                        <p className="text-xs text-white/40 mt-1 uppercase tracking-wider font-medium">{item.meta}</p>
                                      </div>
                                  </div>
                                  <div className="pl-12 md:pl-0 mt-3 md:mt-0">
                                      <span className="text-[10px] md:text-xs text-blue-300/60 bg-blue-500/5 px-3 py-1 rounded-full group-hover:bg-blue-500/20 group-hover:text-blue-200 transition-colors whitespace-nowrap font-medium">Read Article</span>
                                  </div>
                                </a>
                            ))}
                          </div>
                      </div>
                    )}

                  </div>
                </div>
              )}

              {/* VIEW: REPORT ISSUE */}
              {currentView === 'report-issue' && (
                <ReportIssue 
                  onSubmitSuccess={handleReportSuccess}
                  onCancel={() => setCurrentView('dashboard')}
                />
              )}

              {/* VIEW: HISTORY (NEW) */}
              {currentView === 'history' && (
                <ReportHistory 
                  activity={activity}
                  onBack={() => setCurrentView('dashboard')}
                />
              )}
              
              {/* VIEW: UPLOAD EVIDENCE */}
              {currentView === 'upload-evidence' && (
                <UploadEvidence 
                  onContinue={handleEvidenceAnalysisComplete}
                  onCancel={() => setCurrentView('dashboard')}
                />
              )}
              
              {/* VIEW: COMPLAINT PREVIEW */}
              {currentView === 'complaint-preview' && (
                <ComplaintPreview 
                  data={evidenceData}
                  onSubmit={handleComplaintSubmit}
                  onBack={() => setCurrentView('upload-evidence')}
                />
              )}

              {/* VIEW: GUEST SUCCESS CONVERSION PROMPT */}
              {currentView === 'guest-success' && (
                <div className="w-full max-w-lg mx-auto py-12 px-8 border border-white/5 bg-white/[0.015] rounded-sm text-center relative z-10 my-16">
                   <div className="w-20 h-20 mx-auto bg-green-500/10 text-green-400 flex items-center justify-center rounded-full mb-8">
                      <FileText className="w-10 h-10" />
                   </div>
                   <h3 className="text-2xl font-bold text-white mb-4">Complaint Ready!</h3>
                   <p className="text-gray-400 mb-10 text-sm leading-relaxed font-medium">
                     Your report has been successfully processed and formatted for submission. 
                     Because you are using <span className="text-white">Guest Mode</span>, this complaint will not be saved or tracked once you leave.
                   </p>
                   
                   <div className="flex flex-col gap-4 w-full px-4">
                      <button onClick={() => setCurrentView('signup')} className="w-full py-3.5 bg-white text-black font-bold text-sm tracking-wide rounded-sm hover:bg-gray-200 transition-colors shadow-sm">
                        SIGN UP TO SAVE OR SUBMIT
                      </button>
                      <button onClick={() => setCurrentView('dashboard')} className="w-full py-3.5 border border-white/10 text-gray-400 hover:text-white font-semibold text-sm tracking-wide rounded-sm hover:bg-white/[0.05] transition-colors">
                        Return to Menu
                      </button>
                   </div>
                </div>
              )}
              
            </div>
          )}

        </div>
      </main>

      {/* Subtle Grain Overlay */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
    </div>
  );
}