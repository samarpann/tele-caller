'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Phone,
  MessageSquare,
  Upload,
  Download,
  List,
  CheckCircle2,
  Clock,
  PhoneOff,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Search,
  Sparkles,
  MapPin,
  User,
  Package,
  Layers,
  FileSpreadsheet,
  RefreshCw,
  X,
  Building2,
  Calendar,
  Users,
  Target,
  Compass,
  ExternalLink,
  Zap,
  TrendingUp,
  LogOut,
  ShieldCheck,
  UserPlus,
  Key,
  Check,
  Copy,
  Split,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  UserCheck
} from 'lucide-react';

interface CurrentUser {
  username: string;
  name: string;
  role: 'super_admin' | 'caller';
}

interface Lead {
  id: string;
  leadId: string;
  businessName: string;
  category: string;
  products: string;
  contactPerson: string;
  phone: string | number;
  address: string;
  city: string;
  pincode: string | number;
  landmark?: string;
  estYear?: string | number;
  turnover?: string;
  teamSize?: string;
  facilityArea?: string;
  targetBuyers?: string;
  companyBio?: string;
  iceBreaker?: string;
  websiteStatus: string;
  pitchAngle: string;
  status?: 'Pending' | 'Interested' | 'Callback' | 'No Answer' | 'Not Interested';
  notes?: string;
  callbackTime?: string;
  updatedAt?: string;
  assignedTo?: string;
  assignedToName?: string;
  assignedAt?: string;
  // Jewellery Specific Fields
  jewelrySpecialty?: string;
  currentSoftware?: string;
  workshopStatus?: string;
  targetSegment?: string;
}

interface Stats {
  total: number;
  called: number;
  pending: number;
  interested: number;
  callback: number;
  noAnswer: number;
  rejected: number;
  conversionRate: number;
  unassigned?: number;
}

interface CallerUser {
  id: string;
  username: string;
  name: string;
  role: 'super_admin' | 'caller';
  active: boolean;
  password?: string;
  createdAt: string;
  stats: {
    totalAssigned: number;
    called: number;
    pending: number;
    interested: number;
    callback: number;
    noAnswer: number;
    rejected: number;
    conversionRate: number;
  };
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
}

export default function TelecallerApp() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Leads & Pagination State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
    hasPrev: false,
    hasNext: false
  });
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Super Admin view controls
  const [adminTab, setAdminTab] = useState<'distribution' | 'callers' | 'dialer'>('distribution');
  const [callerFilter, setCallerFilter] = useState<string>('all'); // 'all', 'unassigned', or username
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('all');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('West Delhi Jewellers');
  const [selectedWestDelhiHub, setSelectedWestDelhiHub] = useState<string>('all');
  const [selectedPitchAngle, setSelectedPitchAngle] = useState<'karigar' | 'quote' | 'memo' | 'rate_lock' | 'shopify'>('karigar');
  const [viewMode, setViewMode] = useState<'deck' | 'table'>('deck');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());

  // Callers list
  const [callersList, setCallersList] = useState<CallerUser[]>([]);

  // UI state for uncluttered card
  const [showFullDetails, setShowFullDetails] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedIceBreaker, setCopiedIceBreaker] = useState(false);

  // Modals
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isNoteOpen, setIsNoteOpen] = useState(false);

  // Form states
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [createUserError, setCreateUserError] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);

  const [targetAssignCaller, setTargetAssignCaller] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [selectingAll, setSelectingAll] = useState(false);

  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [callbackDateTime, setCallbackDateTime] = useState('');

  const [uploading, setUploading] = useState(false);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 1. Check Session Auth
  const checkAuth = async () => {
    try {
      setAuthLoading(true);
      const res = await fetch('/api/auth/me');
      const data = await res.json();

      if (!res.ok || !data.authenticated || !data.user) {
        router.push('/login');
        return;
      }

      setCurrentUser(data.user);
      if (data.user.role === 'caller') {
        setAdminTab('dialer');
      }
    } catch {
      router.push('/login');
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // 2. Server-Side Fetch Leads with Pagination & Search
  const fetchLeads = useCallback(
    async (pageToLoad = 1, currentLimit = pagination.limit) => {
      if (!currentUser) return;
      try {
        setLoading(true);

        const params = new URLSearchParams();
        params.set('page', String(pageToLoad));
        params.set('limit', String(currentLimit));

        if (activeStatusFilter !== 'all') {
          params.set('status', activeStatusFilter);
        }

        if (activeCategoryFilter !== 'all') {
          params.set('category', activeCategoryFilter);
        }

        if (debouncedSearch.trim()) {
          params.set('search', debouncedSearch.trim());
        }

        if (currentUser.role === 'super_admin' && callerFilter !== 'all') {
          params.set('assignedTo', callerFilter);
        }

        const [leadsRes, statsRes] = await Promise.all([
          fetch(`/api/leads?${params.toString()}`),
          fetch(`/api/stats${currentUser.role === 'super_admin' && callerFilter !== 'all' ? `?assignedTo=${encodeURIComponent(callerFilter)}` : ''}`)
        ]);

        const leadsData = await leadsRes.json();
        const statsData = await statsRes.json();

        if (leadsData.success) {
          setLeads(leadsData.leads);
          setPagination({
            total: leadsData.total || 0,
            page: leadsData.page || 1,
            limit: leadsData.limit || currentLimit,
            totalPages: leadsData.totalPages || 1,
            hasPrev: leadsData.hasPrev || false,
            hasNext: leadsData.hasNext || false
          });
          setCurrentIndex(0);
        }

        if (statsData.success) {
          setStats(statsData.stats);
        }
      } catch (err) {
        console.error('Error fetching leads:', err);
      } finally {
        setLoading(false);
      }
    },
    [currentUser, activeStatusFilter, activeCategoryFilter, debouncedSearch, callerFilter, pagination.limit]
  );

  // 3. Load Callers for Super Admin
  const loadCallers = async () => {
    if (currentUser?.role !== 'super_admin') return;
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success) {
        setCallersList(data.users);
      }
    } catch (err) {
      console.error('Error loading callers:', err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchLeads(1);
      if (currentUser.role === 'super_admin') {
        loadCallers();
      }
    }
  }, [currentUser, activeStatusFilter, debouncedSearch, callerFilter]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch {
      router.push('/login');
    }
  };

  const currentLead = leads[currentIndex] || null;

  // Outcome updates
  const updateStatus = async (
    id: string,
    status: 'Pending' | 'Interested' | 'Callback' | 'No Answer' | 'Not Interested',
    notes?: string,
    callbackTime?: string
  ) => {
    try {
      setLeads(prev =>
        prev.map(l =>
          l.id === id ? { ...l, status, notes: notes || l.notes, callbackTime: callbackTime || l.callbackTime } : l
        )
      );

      await fetch(`/api/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes, callbackTime })
      });

      // Refresh stats
      const statsRes = await fetch('/api/stats');
      const statsData = await statsRes.json();
      if (statsData.success) setStats(statsData.stats);
    } catch (err) {
      console.error('Failed to update lead:', err);
    }
  };

  const handleNextLead = () => {
    if (currentIndex < leads.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowFullDetails(false);
    } else if (pagination.hasNext) {
      fetchLeads(pagination.page + 1);
      setShowFullDetails(false);
    }
  };

  const handlePrevLead = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setShowFullDetails(false);
    } else if (pagination.hasPrev) {
      fetchLeads(pagination.page - 1);
      setShowFullDetails(false);
    }
  };

  const triggerOutcome = (status: 'Interested' | 'Callback' | 'No Answer' | 'Not Interested') => {
    if (!currentLead) return;
    if (status === 'Interested' || status === 'Callback') {
      setPendingStatus(status);
      setNoteText(currentLead.notes || '');
      setCallbackDateTime(currentLead.callbackTime || '');
      setIsNoteOpen(true);
    } else {
      updateStatus(currentLead.id, status);
      handleNextLead();
    }
  };

  const saveNoteAndAdvance = () => {
    if (!currentLead || !pendingStatus) return;
    updateStatus(
      currentLead.id,
      pendingStatus as any,
      noteText,
      pendingStatus === 'Callback' ? callbackDateTime : undefined
    );
    setIsNoteOpen(false);
    setPendingStatus(null);
    setNoteText('');
    setCallbackDateTime('');
    handleNextLead();
  };

  // 1-Click Auto-Distribute Equally
  const handleAutoDistribute = async () => {
    const activeCallers = callersList.filter(c => c.role === 'caller' && c.active);
    if (activeCallers.length === 0) {
      alert('No active sales callers available.');
      return;
    }

    if (!confirm(`Distribute unassigned leads equally among ${activeCallers.length} callers?`)) return;

    try {
      setAssigning(true);
      const res = await fetch('/api/leads/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'auto-distribute',
          callerUsernames: activeCallers.map(c => c.username),
          unassignedOnly: true
        })
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        await Promise.all([fetchLeads(1), loadCallers()]);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch {
      alert('Failed to distribute leads.');
    } finally {
      setAssigning(false);
    }
  };

  // Bulk Assign
  const handleBulkAssign = async () => {
    if (selectedLeadIds.size === 0 || !targetAssignCaller) return;

    try {
      setAssigning(true);
      const res = await fetch('/api/leads/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'bulk',
          leadIds: Array.from(selectedLeadIds),
          username: targetAssignCaller
        })
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setSelectedLeadIds(new Set());
        setIsAssignModalOpen(false);
        await Promise.all([fetchLeads(pagination.page), loadCallers()]);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch {
      alert('Failed to assign leads.');
    } finally {
      setAssigning(false);
    }
  };

  // Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserError('');

    try {
      setCreatingUser(true);
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername.trim(),
          name: newName.trim(),
          password: newPassword.trim(),
          role: 'caller'
        })
      });

      const data = await res.json();
      if (data.success) {
        alert(`Created caller ${data.user.name} (@${data.user.username}) successfully!`);
        setIsCreateUserOpen(false);
        setNewUsername('');
        setNewName('');
        setNewPassword('');
        await loadCallers();
      } else {
        setCreateUserError(data.error || 'Failed to create caller.');
      }
    } catch {
      setCreateUserError('Error connecting to server.');
    } finally {
      setCreatingUser(false);
    }
  };

  // File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', importMode);

      const res = await fetch('/api/leads', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setIsImportOpen(false);
        await Promise.all([fetchLeads(1), loadCallers()]);
      } else {
        alert(`Upload error: ${data.error}`);
      }
    } catch {
      alert('Upload failed.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const copyPhoneToClipboard = (phoneStr: string) => {
    navigator.clipboard.writeText(phoneStr);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const copyIceBreakerText = () => {
    if (!currentLead?.iceBreaker) return;
    navigator.clipboard.writeText(currentLead.iceBreaker);
    setCopiedIceBreaker(true);
    setTimeout(() => setCopiedIceBreaker(false), 2000);
  };

  const toggleSelectAll = () => {
    const allPageSelected = leads.length > 0 && leads.every(l => selectedLeadIds.has(l.id));
    if (allPageSelected) {
      setSelectedLeadIds(prev => {
        const next = new Set(prev);
        leads.forEach(l => next.delete(l.id));
        return next;
      });
    } else {
      setSelectedLeadIds(prev => {
        const next = new Set(prev);
        leads.forEach(l => next.add(l.id));
        return next;
      });
    }
  };

  const handleSelectAllAcrossPages = async () => {
    try {
      setSelectingAll(true);
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('limit', '1000'); // fetch all matching leads up to 1000
      if (activeStatusFilter !== 'all') params.set('status', activeStatusFilter);
      if (activeCategoryFilter !== 'all') params.set('category', activeCategoryFilter);
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (currentUser?.role === 'super_admin' && callerFilter !== 'all') {
        params.set('assignedTo', callerFilter);
      }

      const res = await fetch(`/api/leads?${params.toString()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.leads)) {
        const allIds = new Set<string>(data.leads.map((l: Lead) => l.id));
        setSelectedLeadIds(allIds);
      }
    } catch (err) {
      console.error('Failed to select all leads:', err);
    } finally {
      setSelectingAll(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedLeadIds(new Set());
  };

  const toggleLeadSelect = (id: string) => {
    setSelectedLeadIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#070b13] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400">Connecting to secure portal...</p>
      </div>
    );
  }

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const cleanPhone = currentLead ? String(currentLead.phone || '').replace(/[^0-9]/g, '') : '';
  const waPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
  const ownerName = currentLead?.contactPerson || 'Sir/Madam';
  const businessName = currentLead?.businessName || '';
  const city = currentLead?.city || 'Delhi NCR';
  const category = currentLead?.category || '';
  const catLower = category.toLowerCase();
  let pitchIntro = `We help ${category} businesses build verified digital catalogs & get direct client inquiries.`;
  if (catLower.includes('jewel') || catLower.includes('gold') || catLower.includes('diamond')) {
    if (selectedPitchAngle === 'karigar') {
      pitchIntro = `We help premier West Delhi jewelry showrooms automate custom karigar workshop tracking from casting to hallmarking, sending automated WhatsApp progress updates to brides.`;
    } else if (selectedPitchAngle === 'quote') {
      pitchIntro = `We help West Delhi jewelers generate branded luxury PDF quotations with live 22K/18K gold rates & diamond tiers in 15 seconds directly inside WhatsApp Web.`;
    } else if (selectedPitchAngle === 'memo') {
      pitchIntro = `We help West Delhi jewelry houses track VIP bridal home approvals digitally with OTP security receipts and 1-click GST invoice conversion without paper memo risk.`;
    } else if (selectedPitchAngle === 'rate_lock') {
      pitchIntro = `We help West Delhi showrooms run Gold Rate-Lock & wedding advance schemes, securing guaranteed high-ticket sales months before wedding season.`;
    } else {
      pitchIntro = `We help West Delhi diamond boutiques auto-generate 72 variants on Shopify with live gold pricing and real-time counter inventory sync.`;
    }
  } else if (catLower.includes('salon') || catLower.includes('spa') || catLower.includes('aesthetic')) {
    pitchIntro = `We help top luxury salons & aesthetic studios build direct WhatsApp appointment booking systems & digital bridal rate cards without paying aggregator commissions.`;
  } else if (catLower.includes('cafe') || catLower.includes('bistro') || catLower.includes('bakery') || catLower.includes('coffee') || catLower.includes('roaster')) {
    pitchIntro = `We help popular cafes & bistros get direct table reservations & zero-commission QR digital menus without 25% aggregator cuts.`;
  } else {
    pitchIntro = `We help ${category} manufacturers build official B2B digital catalogs & get direct buyer inquiries.`;
  }

  const waMessage = encodeURIComponent(
    `Namaste ${ownerName} ji, I was reviewing ${businessName} in ${city}. ${pitchIntro} May I share a 1-minute video demo on WhatsApp?`
  );

  const getCategoryBadgeClass = (cat: string = '') => {
    const c = cat.toLowerCase();
    if (c.includes('jewel') || c.includes('gold') || c.includes('diamond')) {
      return 'bg-gradient-to-r from-amber-950 to-yellow-950 text-amber-200 border-amber-500/70 shadow-sm shadow-amber-500/20 font-bold';
    }
    if (c.includes('salon') || c.includes('spa') || c.includes('aesthetic')) {
      return 'bg-pink-950/70 text-pink-300 border-pink-700/60';
    }
    if (c.includes('cafe') || c.includes('bistro') || c.includes('bakery') || c.includes('coffee')) {
      return 'bg-amber-950/70 text-amber-300 border-amber-700/60';
    }
    if (c.includes('steel') || c.includes('metal')) {
      return 'bg-blue-950/70 text-blue-300 border-blue-700/60';
    }
    if (c.includes('marble') || c.includes('stone')) {
      return 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60';
    }
    if (c.includes('electrical')) {
      return 'bg-yellow-950/70 text-yellow-300 border-yellow-700/60';
    }
    if (c.includes('sunmica') || c.includes('laminate')) {
      return 'bg-orange-950/70 text-orange-300 border-orange-700/60';
    }
    if (c.includes('upvc')) {
      return 'bg-cyan-950/70 text-cyan-300 border-cyan-700/60';
    }
    return 'bg-slate-800/80 text-slate-300 border-slate-700/60';
  };

  const mapsQuery = encodeURIComponent(
    `${businessName} ${currentLead?.landmark || ''} ${currentLead?.address || ''} ${city}`
  );
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

  return (
    <div className="flex flex-col min-h-screen pb-32 md:pb-12 bg-[#070b14] text-slate-100 antialiased selection:bg-sky-500 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#0c1220]/95 backdrop-blur-md border-b border-slate-800/80 px-3 md:px-5 py-2.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 via-yellow-500 to-amber-300 flex items-center justify-center font-black text-slate-950 text-base shadow-md shadow-amber-500/20 shrink-0">
              💎
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-black text-amber-300 tracking-tight flex items-center gap-1">
                  <span>JewelERP</span>
                  <span className="text-slate-100 font-bold">Telecaller</span>
                </span>
                <span className="text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm shadow-amber-500/10">
                  <span>💍</span> West Delhi Jewellers Edition
                </span>
                {isSuperAdmin ? (
                  <span className="text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-purple-400" /> Super Admin
                  </span>
                ) : (
                  <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-emerald-400" /> Sales: {currentUser?.name}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {isSuperAdmin ? 'West Delhi Jewellery Showrooms & Diamond Merchants • Rajouri • Karol Bagh • Tilak Nagar • Punjabi Bagh' : `@${currentUser?.username} • West Delhi Assigned Queue`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <a
                href="/api/export?format=xlsx"
                className="px-2.5 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/40 text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5 transition"
                title="Download Master Excel Report"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export Excel</span>
              </a>
            )}

            <button
              onClick={handleLogout}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/50 hover:text-rose-300 border border-slate-700/80 text-[11px] font-medium text-slate-300 flex items-center gap-1.5 transition"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Super Admin Tabs */}
        {isSuperAdmin && (
          <div className="max-w-5xl mx-auto flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-800/80 overflow-x-auto scrollbar-none text-[11px]">
            <button
              onClick={() => setAdminTab('distribution')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
                adminTab === 'distribution'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
              }`}
            >
              <Split className="w-3.5 h-3.5" />
              <span>Lead Distribution</span>
              <span className="text-[9px] bg-black/40 px-1 py-0.2 rounded font-mono">
                {stats?.unassigned || 0} unassigned
              </span>
            </button>

            <button
              onClick={() => setAdminTab('callers')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
                adminTab === 'callers'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Team & Passwords ({callersList.filter(c => c.role === 'caller').length})</span>
            </button>

            <button
              onClick={() => setAdminTab('dialer')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
                adminTab === 'dialer'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Live Dialer Preview</span>
            </button>

            <button
              onClick={() => setIsImportOpen(true)}
              className="px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 text-slate-400 hover:text-slate-200 bg-slate-900/60 ml-auto transition"
            >
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span>Import Sheet</span>
            </button>
          </div>
        )}
      </header>

      {/* Modern Compact Metrics Bar */}
      <section className="bg-[#0a0f1d] border-b border-slate-800/80 px-3 md:px-5 py-2">
        <div className="max-w-5xl mx-auto space-y-1.5">
          <div className="flex justify-between items-center text-[11px] md:text-xs">
            <span className="text-slate-400">
              {isSuperAdmin
                ? callerFilter === 'all'
                  ? 'Total Leads: '
                  : `Queue for ${callerFilter}: `
                : 'Your Queue: '}
              <strong className="text-sky-400 font-bold">
                {stats ? `${stats.called} / ${stats.total} (${stats.total > 0 ? Math.round((stats.called / stats.total) * 100) : 0}%)` : '0 / 0'}
              </strong>
            </span>
            <div className="flex items-center gap-3">
              <span className="text-slate-400">
                Pending: <strong className="text-emerald-400 font-bold">{stats ? stats.pending : 0}</strong>
              </span>
              <span className="text-slate-400">
                Interested: <strong className="text-emerald-300 font-bold">{stats ? stats.interested : 0}</strong>
              </span>
            </div>
          </div>

          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-400 transition-all duration-300"
              style={{
                width: stats && stats.total > 0 ? `${(stats.called / stats.total) * 100}%` : '0%'
              }}
            />
          </div>

          {/* Industry Category Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[10px] md:text-[11px] pt-1 border-b border-slate-800/40">
            {[
              { label: 'West Delhi Jewellers (80)', value: 'West Delhi Jewellers', icon: '💍', featured: true },
              { label: 'All Sectors (380)', value: 'all', icon: '🌐' },
              { label: 'Salons & Spas (50)', value: 'Salon', icon: '💇‍♀️' },
              { label: 'Cafes & Bistros (50)', value: 'Cafe', icon: '☕' },
              { label: 'Steel & PEB (46)', value: 'Steel', icon: '🔩' },
              { label: 'Marble & Stone (33)', value: 'Marble', icon: '🪨' },
              { label: 'Electrical (31)', value: 'Electrical', icon: '⚡' },
              { label: 'Sunmica (31)', value: 'Sunmica', icon: '🪵' },
              { label: 'UPVC Doors (30)', value: 'UPVC', icon: '🪟' },
              { label: 'Packaging (29)', value: 'Packaging', icon: '📦' },
            ].map(catItem => (
              <button
                key={catItem.value}
                onClick={() => {
                  setActiveCategoryFilter(catItem.value);
                  setSelectedWestDelhiHub('all');
                  fetchLeads(1);
                }}
                className={`px-2.5 py-0.5 rounded-full font-medium transition border whitespace-nowrap flex items-center gap-1 ${
                  activeCategoryFilter === catItem.value
                    ? catItem.featured
                      ? 'bg-gradient-to-r from-amber-500/30 to-yellow-500/20 text-amber-200 border-amber-400 font-bold shadow-md shadow-amber-500/20 ring-1 ring-amber-400/50'
                      : 'bg-sky-500/20 text-sky-200 border-sky-400 font-bold shadow-sm shadow-sky-500/20'
                    : catItem.featured
                    ? 'bg-amber-950/40 text-amber-300/90 border-amber-800/80 hover:border-amber-600'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>{catItem.icon}</span>
                <span>{catItem.label}</span>
              </button>
            ))}
          </div>

          {/* West Delhi Sub-Market Filter Row */}
          {(activeCategoryFilter === 'West Delhi Jewellers' || activeCategoryFilter === 'all') && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[10px] md:text-[11px] pt-1 border-b border-amber-900/40 bg-amber-950/20 px-2 py-1 rounded-lg">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1 shrink-0">
                <span>📍</span> West Delhi Hub:
              </span>
              {[
                { label: 'All Hubs (80)', value: 'all' },
                { label: '✨ Rajouri Garden (20)', value: 'Rajouri Garden' },
                { label: '🪙 Karol Bagh Bank St (20)', value: 'Karol Bagh' },
                { label: '👑 Tilak Nagar (15)', value: 'Tilak Nagar' },
                { label: '💎 Punjabi Bagh (15)', value: 'Punjabi Bagh' },
                { label: '🏬 Janakpuri & Paschim Vihar (10)', value: 'Janakpuri' }
              ].map(hub => (
                <button
                  key={hub.label}
                  onClick={() => {
                    setSelectedWestDelhiHub(hub.value);
                    const q = hub.value === 'all' ? '' : hub.value;
                    setSearchQuery(q);
                    setDebouncedSearch(q);
                  }}
                  className={`px-2 py-0.5 rounded-md font-semibold transition border whitespace-nowrap text-[10px] ${
                    selectedWestDelhiHub === hub.value
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-sm shadow-amber-500/30'
                      : 'bg-slate-900/80 text-amber-200/70 border-slate-800 hover:border-amber-700/60'
                  }`}
                >
                  {hub.label}
                </button>
              ))}
            </div>
          )}

          {/* Clean Outcome Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-[10px] md:text-[11px] pt-1">
            <button
              onClick={() => setActiveStatusFilter('all')}
              className={`px-2.5 py-0.5 rounded-full font-medium transition border ${
                activeStatusFilter === 'all'
                  ? 'bg-slate-700 text-white border-sky-400'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              All ({stats?.total || 0})
            </button>
            <button
              onClick={() => setActiveStatusFilter('Pending')}
              className={`px-2.5 py-0.5 rounded-full font-medium transition border ${
                activeStatusFilter === 'Pending'
                  ? 'bg-sky-950 text-sky-200 border-sky-400'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800'
              }`}
            >
              Pending ({stats?.pending || 0})
            </button>
            <button
              onClick={() => setActiveStatusFilter('Interested')}
              className={`px-2.5 py-0.5 rounded-full font-medium transition border ${
                activeStatusFilter === 'Interested'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-400'
                  : 'bg-emerald-950/20 text-emerald-400/80 border-emerald-900/40'
              }`}
            >
              ✅ Interested ({stats?.interested || 0})
            </button>
            <button
              onClick={() => setActiveStatusFilter('Callback')}
              className={`px-2.5 py-0.5 rounded-full font-medium transition border ${
                activeStatusFilter === 'Callback'
                  ? 'bg-amber-950 text-amber-300 border-amber-400'
                  : 'bg-amber-950/20 text-amber-400/80 border-amber-900/40'
              }`}
            >
              ⏳ Callback ({stats?.callback || 0})
            </button>
            <button
              onClick={() => setActiveStatusFilter('No Answer')}
              className={`px-2.5 py-0.5 rounded-full font-medium transition border ${
                activeStatusFilter === 'No Answer'
                  ? 'bg-slate-700 text-slate-200 border-slate-400'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800'
              }`}
            >
              📵 No Ans ({stats?.noAnswer || 0})
            </button>
            <button
              onClick={() => setActiveStatusFilter('Not Interested')}
              className={`px-2.5 py-0.5 rounded-full font-medium transition border ${
                activeStatusFilter === 'Not Interested'
                  ? 'bg-rose-950 text-rose-300 border-rose-400'
                  : 'bg-rose-950/20 text-rose-400/80 border-rose-900/40'
              }`}
            >
              🔴 Rejected ({stats?.rejected || 0})
            </button>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3 md:px-5 pt-3">
        {/* ================= SUPER ADMIN TAB 1: LEAD DISTRIBUTION ================= */}
        {isSuperAdmin && adminTab === 'distribution' && (
          <div className="space-y-3.5">
            {/* Action Bar */}
            <div className="bg-[#0c1220] border border-slate-800/90 rounded-2xl p-4 shadow-xl space-y-3">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <h2 className="text-sm md:text-base font-bold text-slate-100 flex items-center gap-2">
                    <Split className="w-4 h-4 text-sky-400" />
                    <span>Lead Distribution & Assignment</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Auto-distribute leads round-robin to all 5 sales callers or manually assign selected batches.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAutoDistribute}
                    disabled={assigning}
                    className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-sky-500/20 active:scale-95 transition disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Auto-Distribute (5 Callers)</span>
                  </button>

                  {selectedLeadIds.size > 0 && (
                    <button
                      onClick={() => setIsAssignModalOpen(true)}
                      className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Assign ({selectedLeadIds.size})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Server-Side Search & Filter Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800/70">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search company, owner, city, phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#080d19] border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <select
                    value={callerFilter}
                    onChange={(e) => setCallerFilter(e.target.value)}
                    className="w-full bg-[#080d19] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                  >
                    <option value="all">Filter: All Leads ({stats?.total || 0})</option>
                    <option value="unassigned">Filter: Unassigned Leads Only ({stats?.unassigned || 0})</option>
                    {callersList.filter(c => c.role === 'caller').map(c => (
                      <option key={c.username} value={c.username}>
                        Filter: Assigned to {c.name} (@{c.username})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end text-xs text-slate-400">
                  <span>
                    Total: <strong className="text-slate-200">{pagination.total}</strong> leads in Atlas
                  </span>
                </div>
              </div>
            </div>

            {/* Leads Table */}
            <div className="bg-[#0c1220] border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
              {/* Enhanced Selection & Action Bar */}
              <div className="p-3 bg-[#080d19] border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={leads.length > 0 && leads.every(l => selectedLeadIds.has(l.id))}
                    onChange={toggleSelectAll}
                    className="rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-0 cursor-pointer w-4 h-4"
                    title="Toggle select page"
                  />

                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">
                      {selectedLeadIds.size > 0 ? (
                        <span className="text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-full">
                          {selectedLeadIds.size} selected
                        </span>
                      ) : (
                        <span className="text-slate-400">0 selected</span>
                      )}
                    </span>

                    {/* SELECT ALL 300 LEADS BUTTON */}
                    <button
                      onClick={handleSelectAllAcrossPages}
                      disabled={selectingAll}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm ${
                        selectedLeadIds.size === pagination.total && pagination.total > 0
                          ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500 shadow-emerald-500/20'
                          : 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/40 shadow-sky-500/10'
                      }`}
                      title="Select all matching leads across all pages"
                    >
                      {selectingAll ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
                          <span>Selecting all {pagination.total}...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>
                            {selectedLeadIds.size === pagination.total && pagination.total > 0
                              ? `All ${pagination.total} Selected ✓`
                              : `Select ALL ${pagination.total} Leads`}
                          </span>
                        </>
                      )}
                    </button>

                    {selectedLeadIds.size > 0 && (
                      <button
                        onClick={handleClearSelection}
                        className="text-xs text-slate-400 hover:text-rose-400 transition underline underline-offset-2 ml-1"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {selectedLeadIds.size > 0 && (
                  <button
                    onClick={() => setIsAssignModalOpen(true)}
                    className="py-1.5 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/25 active:scale-95 transition"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Assign ({selectedLeadIds.size}) Leads ➔</span>
                  </button>
                )}
              </div>

              {/* Gmail-style helper banner when page is selected but more exist */}
              {leads.length > 0 && leads.every(l => selectedLeadIds.has(l.id)) && selectedLeadIds.size < pagination.total && (
                <div className="px-4 py-2 bg-sky-950/40 border-b border-sky-800/50 text-xs text-sky-200 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    All <strong>{leads.length}</strong> leads on this page are selected.
                  </span>
                  <button
                    onClick={handleSelectAllAcrossPages}
                    disabled={selectingAll}
                    className="font-bold underline text-sky-400 hover:text-sky-300 transition"
                  >
                    👉 Click here to select ALL {pagination.total} leads across all pages
                  </button>
                </div>
              )}

              {/* All selected banner */}
              {selectedLeadIds.size > 0 && selectedLeadIds.size === pagination.total && (
                <div className="px-4 py-2 bg-emerald-950/40 border-b border-emerald-800/50 text-xs text-emerald-200 flex items-center justify-between">
                  <span>
                    ✅ All <strong>{pagination.total}</strong> leads across all pages are selected and ready for assignment!
                  </span>
                  <button
                    onClick={handleClearSelection}
                    className="font-bold underline text-emerald-400 hover:text-emerald-300 transition"
                  >
                    Deselect all
                  </button>
                </div>
              )}

              <div className="overflow-x-auto max-h-[58vh]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#080d19] text-slate-400 uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-800 z-10">
                    <tr>
                      <th className="p-3 w-8"></th>
                      <th className="p-3">ID</th>
                      <th className="p-3">Showroom & Owner</th>
                      <th className="p-3">Jeweller Specialty & Tech Gap</th>
                      <th className="p-3">West Delhi Hub & Area</th>
                      <th className="p-3">Assigned Caller</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-slate-500 text-xs">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-sky-400" />
                          Querying MongoDB Atlas...
                        </td>
                      </tr>
                    ) : leads.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-slate-500 text-xs">
                          No leads found matching your search.
                        </td>
                      </tr>
                    ) : (
                      leads.map((l) => (
                        <tr
                          key={l.id}
                          className={`hover:bg-slate-800/40 transition ${
                            selectedLeadIds.has(l.id) ? 'bg-sky-950/20' : ''
                          }`}
                        >
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={selectedLeadIds.has(l.id)}
                              onChange={() => toggleLeadSelect(l.id)}
                              className="rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-0 cursor-pointer"
                            />
                          </td>
                          <td className="p-3 font-bold text-sky-400 whitespace-nowrap">{l.leadId}</td>
                          <td className="p-3">
                            <div className="font-bold text-slate-100 flex items-center gap-1.5 flex-wrap">
                              {l.category === 'West Delhi Jewellers' && (
                                <span className="text-amber-400 text-xs" title="West Delhi Jeweller">💎</span>
                              )}
                              <span>{l.businessName}</span>
                            </div>
                            <div className="text-slate-400 text-[11px] mt-0.5">
                              <strong className="text-slate-300">{l.contactPerson}</strong> • <span className="font-mono text-sky-300">{l.phone}</span>
                            </div>
                            {l.category === 'West Delhi Jewellers' && (
                              <div className="text-[9px] text-amber-400/80 font-mono mt-0.5">
                                West Delhi • {l.city}
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            {l.jewelrySpecialty ? (
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border bg-amber-950/80 text-amber-200 border-amber-600/70 shadow-sm shadow-amber-500/10 block w-fit">
                                  💍 {l.jewelrySpecialty}
                                </span>
                                <div className="text-amber-400/90 text-[10px] font-mono flex items-center gap-1">
                                  <span>💻</span>
                                  <span className="truncate max-w-[190px]">{l.currentSoftware || 'Using Tally 9 / Paper Memo'}</span>
                                </div>
                                {l.workshopStatus && (
                                  <div className="text-slate-400 text-[10px] truncate max-w-[190px]">
                                    🔨 {l.workshopStatus}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div>
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${getCategoryBadgeClass(l.category)}`}>
                                  {l.category}
                                </span>
                                <div className="text-slate-500 text-[10px] mt-1">
                                  {l.turnover || '₹2 Cr - ₹5 Cr'} • {l.estYear ? `Est. ${l.estYear}` : ''}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="text-slate-200 font-bold flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                              <span>{l.city}</span>
                            </div>
                            <div className="text-slate-400 text-[10px] truncate max-w-[140px] mt-0.5">
                              {l.landmark || l.address}
                            </div>
                            {l.facilityArea && (
                              <div className="text-slate-500 text-[9px] mt-0.5 truncate max-w-[140px]">
                                🏢 {l.facilityArea}
                              </div>
                            )}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            {l.assignedTo ? (
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                                <span className="font-semibold text-emerald-300">{l.assignedToName}</span>
                                <span className="text-[10px] text-slate-500 font-mono">(@{l.assignedTo})</span>
                              </div>
                            ) : (
                              <span className="text-slate-500 text-[10px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                Unassigned
                              </span>
                            )}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            {l.status === 'Interested' ? (
                              <span className="font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                                Interested
                              </span>
                            ) : l.status === 'Callback' ? (
                              <span className="font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                                Callback
                              </span>
                            ) : l.status === 'No Answer' ? (
                              <span className="font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                                No Answer
                              </span>
                            ) : l.status === 'Not Interested' ? (
                              <span className="font-medium text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-500/30">
                                Rejected
                              </span>
                            ) : (
                              <span className="text-slate-500 bg-slate-900 px-2 py-0.5 rounded">
                                Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Server-Side Pagination Controls */}
              <div className="p-3 bg-[#080d19] border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-slate-400">
                    Showing{' '}
                    <strong className="text-slate-200">
                      {pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}
                    </strong>{' '}
                    to{' '}
                    <strong className="text-slate-200">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </strong>{' '}
                    of <strong className="text-sky-400 font-bold">{pagination.total}</strong> leads
                  </div>

                  {/* Rows per page selector */}
                  <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800/80">
                    <span className="text-[11px] text-slate-500">Rows:</span>
                    {[20, 50, 100, 300].map(sz => (
                      <button
                        key={sz}
                        onClick={() => {
                          setPagination(prev => ({ ...prev, limit: sz }));
                          fetchLeads(1, sz);
                        }}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition border ${
                          pagination.limit === sz
                            ? 'bg-sky-500/20 text-sky-300 border-sky-400 font-bold'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {sz === 300 ? 'All (300)' : sz}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchLeads(pagination.page - 1)}
                    disabled={!pagination.hasPrev || loading}
                    className="px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none text-slate-300 font-medium flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Prev
                  </button>

                  <span className="text-slate-400 font-mono text-[11px] px-1">
                    Page {pagination.page} / {pagination.totalPages}
                  </span>

                  <button
                    onClick={() => fetchLeads(pagination.page + 1)}
                    disabled={!pagination.hasNext || loading}
                    className="px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none text-slate-300 font-medium flex items-center gap-1"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= SUPER ADMIN TAB 2: CALLERS & PASSWORDS ================= */}
        {isSuperAdmin && adminTab === 'callers' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-[#0c1220] border border-slate-800/80 rounded-2xl p-4">
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-400" />
                  <span>Sales Callers & Account Credentials</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Manage login credentials for your 5 sales callers and track their real-time conversion rate.
                </p>
              </div>

              <button
                onClick={() => setIsCreateUserOpen(true)}
                className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-sky-500/20 active:scale-95 transition"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create Caller</span>
              </button>
            </div>

            {/* Caller Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {callersList.filter(u => u.role === 'caller').map((caller) => (
                <div
                  key={caller.username}
                  className="bg-[#0c1220] border border-slate-800/80 rounded-2xl p-4 space-y-3 shadow-lg"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                        <span>{caller.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">(@{caller.username})</span>
                      </h3>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
                        <Key className="w-3 h-3 text-emerald-400" />
                        <span>Pass: <strong className="font-mono text-emerald-300">{caller.password}</strong></span>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                      Active
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-[#080d19] p-2.5 rounded-xl border border-slate-800/70 text-center">
                    <div>
                      <div className="text-[10px] text-slate-400">Assigned</div>
                      <div className="text-sm font-black text-sky-400 mt-0.5">{caller.stats.totalAssigned}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Called</div>
                      <div className="text-sm font-black text-slate-200 mt-0.5">{caller.stats.called}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Interested</div>
                      <div className="text-sm font-black text-emerald-400 mt-0.5">{caller.stats.interested}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <span>Conversion Rate:</span>
                    <strong className="text-emerald-400 font-black">{caller.stats.conversionRate}%</strong>
                  </div>

                  <button
                    onClick={() => {
                      setCallerFilter(caller.username);
                      setAdminTab('dialer');
                    }}
                    className="w-full py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition"
                  >
                    <Eye className="w-3.5 h-3.5 text-sky-400" />
                    <span>View {caller.name}'s Leads</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 3 / CALLER DIALER (UNCLUTTERED, CLEAR & CLEAN) ================= */}
        {(!isSuperAdmin || adminTab === 'dialer') && (
          <div className="space-y-3 max-w-xl mx-auto">
            {/* View Mode Toggle Header */}
            <div className="flex items-center justify-between bg-[#0c1220] border border-slate-800/80 p-2.5 rounded-xl text-xs">
              <span className="text-slate-400">
                {isSuperAdmin
                  ? `Dialer Preview: ${callerFilter === 'all' ? 'All Leads' : callerFilter}`
                  : `Your Assigned Queue: ${stats?.called || 0} called`}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode(viewMode === 'deck' ? 'table' : 'deck')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-xs font-medium text-slate-200 flex items-center gap-1"
                >
                  {viewMode === 'deck' ? <List className="w-3.5 h-3.5 text-amber-400" /> : <Layers className="w-3.5 h-3.5 text-sky-400" />}
                  <span>{viewMode === 'deck' ? 'List View' : 'Card Deck'}</span>
                </button>
              </div>
            </div>

            {/* CARD DECK VIEW (STREAMLINED & UNCLUTTERED) */}
            {viewMode === 'deck' ? (
              currentLead ? (
                <div className="bg-[#0c1220] border border-slate-800/90 rounded-2xl p-4 md:p-5 shadow-2xl space-y-3.5">
                  {/* Top Bar: Lead ID, Category, Caller */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-md text-[11px]">
                        {currentLead.leadId}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        #{currentIndex + 1} of {leads.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${getCategoryBadgeClass(currentLead.category)}`}>
                        {currentLead.category}
                      </span>
                      <span className="text-[10px] font-medium text-rose-400 bg-rose-950/30 px-1.5 py-0.5 rounded border border-rose-900/40">
                        No Website
                      </span>
                    </div>
                  </div>

                  {/* Company Name & Owner */}
                  <div className="space-y-1">
                    <h2 className="text-lg md:text-xl font-black text-slate-100 leading-snug">
                      {currentLead.businessName}
                    </h2>
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-0.5">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-sky-400" />
                        <span>Owner:</span>
                        <strong className="text-sky-300 font-bold">{currentLead.contactPerson}</strong>
                      </div>

                      <button
                        onClick={() => copyPhoneToClipboard(String(currentLead.phone))}
                        className="font-mono font-bold text-slate-300 hover:text-white flex items-center gap-1"
                        title="Click to copy number"
                      >
                        <span>{currentLead.phone}</span>
                        {copiedPhone ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-500" />}
                      </button>
                    </div>
                  </div>

                  {/* JEWELLERY SHOWROOM SPECIFIC VITALS & SOFTWARE GAP */}
                  {currentLead.jewelrySpecialty && (
                    <div className="bg-gradient-to-r from-amber-950/40 via-yellow-950/20 to-amber-950/30 border border-amber-600/40 rounded-xl p-3 space-y-2 text-xs shadow-md shadow-amber-950/20">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-300 flex items-center gap-1.5 text-[11px]">
                          <span>💍</span> {currentLead.jewelrySpecialty}
                        </span>
                        <span className="text-[10px] font-mono text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-600/50">
                          {currentLead.city}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-amber-900/40">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <span className="text-amber-400 font-semibold">💻 Current ERP:</span>
                          <span className="font-mono text-amber-200 truncate">{currentLead.currentSoftware || 'Using Tally 9 & Paper Memo'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <span className="text-amber-400 font-semibold">🔨 Workshop:</span>
                          <span className="truncate">{currentLead.workshopStatus || 'In-House Karigar Unit'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* INTERACTIVE JEWELERP PITCH SELECTOR (DYNAMIC WHATSAPP SCRIPT HOOKS) */}
                  {(currentLead.category === 'West Delhi Jewellers' || currentLead.jewelrySpecialty) && (
                    <div className="bg-[#080d19] border border-slate-800 p-2.5 rounded-xl space-y-1.5">
                      <div className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>Select JewelERP Pitch Hook (Click to switch WhatsApp script):</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[10px]">
                        {[
                          { key: 'karigar', label: '🔨 Karigar Workshop', tip: 'Casting to Hallmarking' },
                          { key: 'quote', label: '💬 WhatsApp Quotes', tip: '15-sec luxury PDF quote' },
                          { key: 'memo', label: '📋 VIP Home Memos', tip: 'Zero-theft approval slips' },
                          { key: 'rate_lock', label: '🔒 Rate-Lock Advance', tip: 'Lock 24K wedding gold' },
                          { key: 'shopify', label: '🛍️ Shopify 72-Variants', tip: 'Showroom sync without clashes' }
                        ].map(angle => (
                          <button
                            key={angle.key}
                            type="button"
                            onClick={() => setSelectedPitchAngle(angle.key as any)}
                            className={`p-1.5 rounded-lg text-left transition border ${
                              selectedPitchAngle === angle.key
                                ? 'bg-amber-500/20 text-amber-200 border-amber-400 font-bold shadow-sm'
                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="font-bold truncate">{angle.label}</div>
                            <div className="text-[9px] text-slate-500 truncate">{angle.tip}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* PRIMARY CALL STRIP: BIG CALL & WHATSAPP BUTTONS */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <a
                      href={`tel:+${cleanPhone}`}
                      className="py-3 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition"
                    >
                      <Phone className="w-4 h-4 fill-white" />
                      <span>Call Now</span>
                    </a>

                    <a
                      href={`https://wa.me/${waPhone}?text=${waMessage}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-3 px-3 rounded-xl bg-gradient-to-r from-[#25d366] to-[#128c7e] hover:brightness-105 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>WhatsApp</span>
                    </a>
                  </div>

                  {/* FOCUSED CALL OPENER (THE MOST CRITICAL DATA) */}
                  {currentLead.iceBreaker && (
                    <div className="bg-amber-950/25 border border-amber-500/30 rounded-xl p-3 space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide">
                          <Zap className="w-3 h-3" /> Best Call Opener / Ice-Breaker
                        </span>
                        <button
                          onClick={copyIceBreakerText}
                          className="text-[10px] text-amber-300 hover:text-white flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-900/40 border border-amber-700/50"
                        >
                          {copiedIceBreaker ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedIceBreaker ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <p className="text-xs text-amber-100/90 leading-relaxed font-medium italic">
                        &ldquo;{currentLead.iceBreaker}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* QUICK VITALS STRIP (COMPACT & UNCLUTTERED) */}
                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 text-[11px] text-slate-300">
                    <span className="bg-[#080d19] border border-slate-800 px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-sky-400" />
                      <span>{currentLead.estYear ? `Est. ${currentLead.estYear}` : '10+ yrs'}</span>
                    </span>

                    <span className="bg-[#080d19] border border-slate-800 px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-emerald-400" />
                      <span>{currentLead.turnover || '₹2 Cr - ₹5 Cr'}</span>
                    </span>

                    <span className="bg-[#080d19] border border-slate-800 px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1">
                      <Users className="w-3 h-3 text-amber-400" />
                      <span>{currentLead.teamSize || '20+ crew'}</span>
                    </span>

                    <span className="bg-[#080d19] border border-slate-800 px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-rose-400" />
                      <span>{currentLead.city}</span>
                    </span>
                  </div>

                  {/* COLLAPSIBLE ACCORDION FOR DEEP COMPANY DATA (CLEAN & NON-CLUTTERED) */}
                  <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-[#080d19]/80">
                    <button
                      type="button"
                      onClick={() => setShowFullDetails(!showFullDetails)}
                      className="w-full p-2.5 text-xs font-semibold text-slate-300 hover:text-white flex items-center justify-between transition"
                    >
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Building2 className="w-3.5 h-3.5 text-sky-400" />
                        <span>Company Bio, Products & Location Details</span>
                      </span>
                      {showFullDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {showFullDetails && (
                      <div className="p-3 pt-1 border-t border-slate-800/60 space-y-2.5 text-xs text-slate-300">
                        {currentLead.products && (
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">Products:</span>
                            <p className="text-slate-200 mt-0.5">{currentLead.products}</p>
                          </div>
                        )}

                        {currentLead.companyBio && (
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">About Company:</span>
                            <p className="text-slate-300 mt-0.5 leading-relaxed">{currentLead.companyBio}</p>
                          </div>
                        )}

                        {currentLead.targetBuyers && (
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">Supplies to:</span>
                            <p className="text-slate-300 mt-0.5">{currentLead.targetBuyers}</p>
                          </div>
                        )}

                        <div className="flex items-start justify-between gap-2 pt-1 border-t border-slate-800/60">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">Landmark & Address:</span>
                            <p className="text-slate-300">{currentLead.address}, {currentLead.landmark || currentLead.city}</p>
                          </div>
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 rounded bg-slate-800 text-sky-400 text-[10px] font-bold flex items-center gap-1 shrink-0"
                          >
                            <ExternalLink className="w-3 h-3" /> Maps
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* OUTCOME BUTTONS (DESKTOP) */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] font-bold text-center uppercase tracking-wider text-slate-500">
                      Record Call Outcome
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        onClick={() => triggerOutcome('Interested')}
                        className="p-2.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Interested</span>
                      </button>

                      <button
                        onClick={() => triggerOutcome('Callback')}
                        className="p-2.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Call Back</span>
                      </button>

                      <button
                        onClick={() => triggerOutcome('No Answer')}
                        className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                      >
                        <PhoneOff className="w-3.5 h-3.5 text-slate-400" />
                        <span>No Ans</span>
                      </button>

                      <button
                        onClick={() => triggerOutcome('Not Interested')}
                        className="p-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                      >
                        <XCircle className="w-3.5 h-3.5 text-rose-400" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>

                  {/* Desktop Nav Arrows */}
                  <div className="hidden md:flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs text-slate-400">
                    <button
                      onClick={handlePrevLead}
                      disabled={currentIndex === 0 && !pagination.hasPrev}
                      className="px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 font-semibold"
                    >
                      <ChevronLeft className="w-4 h-4" /> Prev Lead
                    </button>

                    <span>
                      {currentIndex + 1} / {leads.length} leads on Page {pagination.page}
                    </span>

                    <button
                      onClick={handleNextLead}
                      disabled={currentIndex >= leads.length - 1 && !pagination.hasNext}
                      className="px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 font-semibold"
                    >
                      Next Lead <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-[#0c1220] border border-slate-800 rounded-2xl p-8 text-center space-y-3">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                  <h3 className="text-base font-bold text-slate-200">No leads in this filter</h3>
                  <p className="text-xs text-slate-400">
                    You have finished calling all leads in this queue or no leads match your filter.
                  </p>
                  <button
                    onClick={() => { setActiveStatusFilter('all'); setSearchQuery(''); fetchLeads(1); }}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs rounded-lg transition"
                  >
                    Reset Filter
                  </button>
                </div>
              )
            ) : (
              // Table List View
              <div className="space-y-3">
                <div className="bg-[#0c1220] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto max-h-[65vh]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#080d19] text-slate-400 uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-800 z-10">
                        <tr>
                          <th className="p-3">ID</th>
                          <th className="p-3">Business & Owner</th>
                          <th className="p-3">Category & City</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {leads.map((l, idx) => (
                          <tr
                            key={l.id || idx}
                            onClick={() => {
                              setCurrentIndex(idx);
                              setViewMode('deck');
                            }}
                            className="hover:bg-slate-800/40 cursor-pointer transition"
                          >
                            <td className="p-3 font-bold text-sky-400">{l.leadId}</td>
                            <td className="p-3">
                              <div className="font-bold text-slate-200">{l.businessName}</div>
                              <div className="text-slate-400 text-[11px] mt-0.5">
                                {l.contactPerson} • <span className="font-mono text-sky-300">{l.phone}</span>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="text-slate-300">{l.category}</div>
                              <div className="text-slate-500 text-[10px]">{l.city}</div>
                            </td>
                            <td className="p-3">
                              {l.status === 'Interested' ? (
                                <span className="font-bold text-emerald-400">Interested</span>
                              ) : l.status === 'Callback' ? (
                                <span className="font-bold text-amber-400">Callback</span>
                              ) : l.status === 'No Answer' ? (
                                <span className="font-medium text-slate-400">No Answer</span>
                              ) : l.status === 'Not Interested' ? (
                                <span className="font-medium text-rose-400">Rejected</span>
                              ) : (
                                <span className="text-slate-500">Pending</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ================= ERGONOMIC MOBILE FLOATING BOTTOM BAR ================= */}
      {viewMode === 'deck' && currentLead && (!isSuperAdmin || adminTab === 'dialer') && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#080d19]/95 backdrop-blur-xl border-t border-slate-800/90 p-2.5 shadow-2xl space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevLead}
              disabled={currentIndex === 0 && !pagination.hasPrev}
              className="p-3 rounded-xl bg-slate-800 text-slate-300 disabled:opacity-30 disabled:pointer-events-none active:scale-95 shrink-0"
              title="Previous Lead"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <a
              href={`tel:+${cleanPhone}`}
              className="flex-1 py-3 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/25 active:scale-95"
            >
              <Phone className="w-4 h-4 fill-white" />
              <span>Call ({cleanPhone.slice(-5)})</span>
            </a>

            <a
              href={`https://wa.me/${waPhone}?text=${waMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 px-4 rounded-xl bg-gradient-to-r from-[#25d366] to-[#128c7e] text-white font-bold text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 shrink-0"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WA</span>
            </a>

            <button
              onClick={handleNextLead}
              disabled={currentIndex >= leads.length - 1 && !pagination.hasNext}
              className="p-3 rounded-xl bg-slate-800 text-slate-300 disabled:opacity-30 disabled:pointer-events-none active:scale-95 shrink-0"
              title="Next Lead"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Outcome Thumb Buttons */}
          <div className="grid grid-cols-4 gap-1.5">
            <button
              onClick={() => triggerOutcome('Interested')}
              className="py-2 px-1 rounded-lg bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 font-bold text-[10px] text-center active:scale-95 truncate"
            >
              ✅ Interested
            </button>
            <button
              onClick={() => triggerOutcome('Callback')}
              className="py-2 px-1 rounded-lg bg-amber-950/70 border border-amber-500/50 text-amber-300 font-bold text-[10px] text-center active:scale-95 truncate"
            >
              ⏳ Callback
            </button>
            <button
              onClick={() => triggerOutcome('No Answer')}
              className="py-2 px-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-[10px] text-center active:scale-95 truncate"
            >
              📵 No Ans
            </button>
            <button
              onClick={() => triggerOutcome('Not Interested')}
              className="py-2 px-1 rounded-lg bg-rose-950/70 border border-rose-500/50 text-rose-300 font-semibold text-[10px] text-center active:scale-95 truncate"
            >
              🔴 Reject
            </button>
          </div>
        </div>
      )}

      {/* ================= MODAL: CREATE USER ================= */}
      {isCreateUserOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-sky-400" />
                <span>Create Sales Caller (MongoDB Atlas)</span>
              </h3>
              <button onClick={() => setIsCreateUserOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {createUserError && (
              <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs">
                {createUserError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">
                  User ID / Username (e.g. sales6, rohit)
                </label>
                <input
                  type="text"
                  placeholder="e.g. sales6"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full bg-[#080d19] border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">
                  Full Name (e.g. Rohit Kumar)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rohit Kumar"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-[#080d19] border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">
                  Password
                </label>
                <input
                  type="text"
                  placeholder="Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-[#080d19] border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateUserOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold"
                >
                  {creatingUser ? 'Creating...' : 'Save to Atlas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ASSIGN LEADS ================= */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                <span>Assign {selectedLeadIds.size} Leads</span>
              </h3>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300">Target Caller</label>
              <select
                value={targetAssignCaller}
                onChange={(e) => setTargetAssignCaller(e.target.value)}
                className="w-full bg-[#080d19] border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              >
                <option value="">-- Choose a Sales Caller --</option>
                {callersList.filter(c => c.role === 'caller').map(c => (
                  <option key={c.username} value={c.username}>
                    {c.name} (@{c.username}) - {c.stats.totalAssigned} currently assigned
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAssign}
                disabled={assigning || !targetAssignCaller}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50"
              >
                {assigning ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CALL NOTE & CALLBACK ================= */}
      {isNoteOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                {pendingStatus === 'Interested' ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>Lead Interested Notes</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-5 h-5 text-amber-400" />
                    <span>Schedule Callback</span>
                  </>
                )}
              </h3>
              <button onClick={() => setIsNoteOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <textarea
              rows={3}
              placeholder="e.g. Owner asked to send digital catalog on WhatsApp..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full bg-[#080d19] border border-slate-700 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />

            {pendingStatus === 'Callback' && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">Callback Date & Time</label>
                <input
                  type="datetime-local"
                  value={callbackDateTime}
                  onChange={(e) => setCallbackDateTime(e.target.value)}
                  className="w-full bg-[#080d19] border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsNoteOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={saveNoteAndAdvance}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold"
              >
                Save & Next Lead ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: IMPORT SHEET ================= */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Upload className="w-5 h-5 text-sky-400" />
                <span>Upload Leads to MongoDB Atlas</span>
              </h3>
              <button onClick={() => setIsImportOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Upload any .csv or .xlsx file. It will be parsed and saved directly into your cloud database.
            </p>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-sky-500 rounded-xl p-6 text-center cursor-pointer bg-slate-900/50 hover:bg-slate-900 transition"
            >
              <FileSpreadsheet className="w-10 h-10 text-sky-400 mx-auto mb-2" />
              <div className="text-xs font-bold text-slate-200">Click to pick CSV or Excel file</div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv, .xlsx, .xls"
              onChange={handleFileUpload}
              className="hidden"
            />

            <div className="flex gap-4 pt-1">
              <label className="text-xs text-slate-300 flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  value="append"
                  checked={importMode === 'append'}
                  onChange={() => setImportMode('append')}
                />
                Append to current list
              </label>

              <label className="text-xs text-slate-300 flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                />
                Start fresh (Replace)
              </label>
            </div>

            {uploading && (
              <div className="flex items-center gap-2 text-xs text-sky-400 justify-center py-1">
                <RefreshCw className="w-4 h-4 animate-spin" /> Uploading to MongoDB Atlas...
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsImportOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
