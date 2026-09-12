import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import {
  Sparkles,
  Mic,
  MicOff,
  CheckCircle2,
  X,
  Search,
  Clock,
  Package,
  Loader2,
  Calendar,
  User,
  Phone,
  Check,
} from 'lucide-react';
import {
  parseTurboNasiyaText,
  resolveCompoundNumbers,
  getTashkentDateString,
  fuzzyMatchUzbek,
} from '../../utils/turboNasiyaEngine';
import { parseNasiyaWithGemini } from '../../api/geminiService';
import { formatMoney, formatDate } from '../../utils/formatters';
import { entriesService } from '../../api/entriesService';
import { Entry } from '../../types/database';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../common/Toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { NavTab } from '../layout/BottomNav';

interface FloatingAIButtonProps {
  isOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  onNavigate?: (tab: NavTab, prefillTurboText?: string) => void;
  showFloatingTrigger?: boolean;
}

export const FloatingAIButton: React.FC<FloatingAIButtonProps> = ({
  isOpen: externalIsOpen,
  onOpen: externalOnOpen,
  onClose: externalOnClose,
  onNavigate: _onNavigate,
  showFloatingTrigger = false,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isControlled = externalIsOpen !== undefined;
  const isOpen = isControlled ? externalIsOpen : internalIsOpen;

  const [activeMode, setActiveMode] = useState<'nasiya' | 'qidirish'>('nasiya');

  // Mode 1: Nasiya recording state
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Inline keyboard editable fields for Nasiya
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editItems, setEditItems] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDueCondition, setEditDueCondition] = useState('Bugun');
  const [dueType, setDueType] = useState<'today' | 'tomorrow' | '3days' | '1week' | 'custom'>('today');
  const [dueDate, setDueDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Mode 2: Qidirish & To'lash (Search by amount / customer name)
  const [searchQuery, setSearchQuery] = useState('');
  const [isSettlingId, setIsSettlingId] = useState<string | null>(null);

  const { profile } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);
  const aiTimerRef = useRef<any>(null);
  const dragControls = useDragControls();

  // Helper date generators
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };
  const getDaysLaterStr = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  // Helper for spaced money format: 49 000
  const formatNumberWithSpaces = (val: number | string): string => {
    const digits = String(val).replace(/\D/g, '');
    if (!digits) return '';
    return Number(digits).toLocaleString('ru-RU');
  };

  // Fetch all entries for O'chirish search
  const { data: entriesData, isLoading: isLoadingEntries } = useQuery({
    queryKey: ['entries', { pageSize: 300 }],
    queryFn: () => entriesService.getEntries({}, 1, 300),
    enabled: isOpen,
  });

  const allEntries: Entry[] = entriesData?.data || [];

  // Parse text using Gemini AI with fallback to Turbo Engine
  const runAiParse = async (rawText: string) => {
    const text = rawText.trim();
    if (!text) {
      return;
    }

    setIsAiThinking(true);
    try {
      // 1. Try Google Gemini AI first (handles Uzbek dialect, "qossob", "rosil", "akfachi")
      const geminiData = await parseNasiyaWithGemini(text);
      if (geminiData && (geminiData.customer_name || geminiData.amount > 0)) {
        if (geminiData.customer_name && geminiData.customer_name !== 'Mijoz') {
          setEditCustomerName(geminiData.customer_name);
        }
        if (geminiData.amount > 0) {
          setEditAmount(String(geminiData.amount));
        }
        if (geminiData.items) {
          setEditItems(geminiData.items);
        }
        if (geminiData.phone) {
          setEditPhone(geminiData.phone);
        }
        if (geminiData.due_condition) {
          setEditDueCondition(geminiData.due_condition);
          const cond = geminiData.due_condition.toLowerCase();
          if (cond.includes('erta')) {
            setDueType('tomorrow');
            setDueDate(getTomorrowStr());
          } else if (cond.includes('3 kun')) {
            setDueType('3days');
            setDueDate(getDaysLaterStr(3));
          } else if (cond.includes('hafta')) {
            setDueType('1week');
            setDueDate(getDaysLaterStr(7));
          } else if (cond.includes('bugun')) {
            setDueType('today');
            setDueDate(getTodayStr());
          }
        }
        setIsAiThinking(false);
        return;
      }
    } catch (err) {
      console.warn('Gemini AI parse error, fallback to local turbo:', err);
    } finally {
      setIsAiThinking(false);
    }

    // 2. Fallback to Local Turbo Engine
    const res = parseTurboNasiyaText(text);
    if (res.transactions.length > 0) {
      const t = res.transactions[0];
      if (t.customer_name && t.customer_name !== 'Mijoz') {
        setEditCustomerName(t.customer_name);
      }
      if (t.amount > 0) {
        setEditAmount(String(t.amount));
      }
      if (t.items && t.items.length > 0) {
        const itemsStr = t.items
          .map(
            (it) =>
              `${it.quantity ? it.quantity + ' ' : ''}${it.unit ? it.unit + ' ' : ''}${it.name}`
          )
          .join(', ');
        setEditItems(itemsStr);
      }
      if (t.due_date) {
        setDueDate(t.due_date);
        if (t.due_condition === 'ertaga') {
          setDueType('tomorrow');
          setEditDueCondition('Ertaga');
        } else {
          setDueType('custom');
          setEditDueCondition(t.due_condition || t.due_date);
        }
      } else if (t.due_condition) {
        setEditDueCondition(t.due_condition);
        if (t.due_condition === 'ertaga') {
          setDueType('tomorrow');
          setDueDate(getTomorrowStr());
        }
      }

      // Check for phone number in text
      const phoneMatch = text.match(/(?:\+?998)?[ -]?(?:9[01345789]|33|88|99)[ -]?\d{3}[ -]?\d{2}[ -]?\d{2}/);
      if (phoneMatch) {
        setEditPhone(phoneMatch[0].trim());
      }
    }
  };

  // Debounced AI parser on inputText change
  useEffect(() => {
    if (!inputText.trim()) {
      return;
    }

    // Instant local preview
    const localRes = parseTurboNasiyaText(inputText);
    if (localRes.transactions.length > 0) {
      const t = localRes.transactions[0];
      if (t.customer_name && t.customer_name !== 'Mijoz' && !editCustomerName) {
        setEditCustomerName(t.customer_name);
      }
      if (t.amount > 0 && !editAmount) {
        setEditAmount(String(t.amount));
      }
    }

    // Debounced full Gemini AI parsing
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    aiTimerRef.current = setTimeout(() => {
      runAiParse(inputText);
    }, 750);

    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, [inputText]);

  // Continuous Web Speech API Voice Recognition
  const toggleSpeechRecognition = (target: 'nasiya' | 'qidirish') => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showToast('Brauzeringiz ovozli yozishni qo‘llab-quvvatlamaydi. Matn kiriting.', 'info');
      return;
    }

    if (isListening) {
      isListeningRef.current = false;
      setIsListening(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'uz-UZ';
      recognition.continuous = true;
      recognition.interimResults = true;

      isListeningRef.current = true;
      setIsListening(true);

      recognition.onresult = (event: any) => {
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript;
        }
        if (fullTranscript.trim()) {
          if (target === 'nasiya') {
            setInputText(fullTranscript);
          } else {
            setSearchQuery(fullTranscript);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          showToast('Mikrofon ruxsati berilmadi.', 'error');
          isListeningRef.current = false;
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        if (isListeningRef.current) {
          try {
            recognition.start();
          } catch {}
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Speech recognition init error:', err);
      isListeningRef.current = false;
      setIsListening(false);
    }
  };

  const handleOpen = () => {
    if (externalOnOpen) externalOnOpen();
    if (!isControlled) setInternalIsOpen(true);
    setActiveMode('nasiya');
  };

  const handleClose = () => {
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
    if (externalOnClose) externalOnClose();
    if (!isControlled) setInternalIsOpen(false);
  };

  // Direct Save for Nasiya mode: saves exact moment, optional phone, due date
  const handleDirectSave = async () => {
    const numAmount = Number(editAmount.replace(/\D/g, ''));
    const customer = editCustomerName.trim();

    if (!customer) {
      showToast('Iltimos, mijoz ismini kiriting.', 'error');
      return;
    }
    if (!numAmount || numAmount <= 0) {
      showToast('Iltimos, to‘g‘ri summa kiriting.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const adminId = profile?.id || 'owner-uuid-1';
      const adminName = profile?.full_name || 'Do‘kon Egasi';
      const description =
        [
          editItems.trim(),
          editDueCondition.trim() ? `To‘lov sharti: ${editDueCondition.trim()}` : '',
        ]
          .filter(Boolean)
          .join(' | ') || null;

      const finalDueDate = dueDate || getTashkentDateString(new Date());

      await entriesService.createManualEntry(
        {
          party_name: customer,
          party_phone: editPhone.trim() || null,
          amount: numAmount,
          direction: 'customer',
          status: 'open',
          due_date: finalDueDate,
          description,
          paid_at: null,
          created_by: adminId,
          last_edited_by: adminId,
        },
        { id: adminId, name: adminName }
      );

      await queryClient.invalidateQueries({ queryKey: ['entries'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      await queryClient.invalidateQueries({ queryKey: ['customerSummaries'] });
      await queryClient.invalidateQueries({ queryKey: ['adminLogs'] });

      showToast(`✅ ${customer} daftariga ${formatMoney(numAmount)} muvaffaqiyatli yozildi!`, 'success');
      setInputText('');
      setEditCustomerName('');
      setEditAmount('');
      setEditItems('');
      setEditPhone('');
      setEditDueCondition('Bugun');
      setDueType('today');
      setDueDate(getTodayStr());
      handleClose();
    } catch (err: any) {
      showToast(err.message || 'Saqlashda xatolik yuz berdi.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered entries for O'chirish mode
  const matchingEntries = useMemo(() => {
    if (!searchQuery.trim()) {
      return allEntries.slice(0, 15);
    }

    const query = searchQuery.trim().toLowerCase();
    const parsed = resolveCompoundNumbers(query);
    const numericOnly = parseInt(query.replace(/\D/g, ''), 10);

    return allEntries.filter((entry) => {
      if (parsed.amount > 0 && entry.amount === parsed.amount) {
        return true;
      }
      if (!isNaN(numericOnly) && numericOnly > 0 && entry.amount === numericOnly) {
        return true;
      }
      if (fuzzyMatchUzbek(query, entry.party_name)) {
        return true;
      }
      const queryWords = query.split(/\s+/).filter((w) => w.length >= 2);
      if (queryWords.some((w) => fuzzyMatchUzbek(w, entry.party_name))) {
        return true;
      }
      if (entry.description && (entry.description.toLowerCase().includes(query) || fuzzyMatchUzbek(query, entry.description))) {
        return true;
      }
      return false;
    });
  }, [searchQuery, allEntries]);


  // Pay/Close Action for an entry in O'chirish mode
  const handleSettleEntry = async (entry: Entry) => {
    const currentAmount = Number(entry.amount) || 0;
    const confirmMsg = `${entry.party_name}ning ${formatMoney(currentAmount)} qarzini to‘liq to‘langan deb belgilaysizmi?`;
    if (!window.confirm(confirmMsg)) return;

    setIsSettlingId(entry.id);
    try {
      const adminId = profile?.id || 'owner-uuid-1';
      await entriesService.payOrReduceDebt(
        entry.id,
        currentAmount,
        { id: adminId, name: profile?.full_name || 'Do‘kon Egasi' },
        'AI Ovozli yordamchi orqali to‘liq to‘landi'
      );

      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['customerSummaries'] });
      queryClient.invalidateQueries({ queryKey: ['adminLogs'] });

      showToast(`✅ ${entry.party_name} qarzi to‘liq yopildi!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'To‘lashda xatolik yuz berdi.', 'error');
    } finally {
      setIsSettlingId(null);
    }
  };

  return (
    <>
      {/* Optional Floating Trigger Button (only if requested, default false since it is in interface) */}
      {showFloatingTrigger && (
        <div className="fixed bottom-18 right-4 z-40 flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleOpen}
            className="relative group flex items-center gap-2 px-4 py-2.5 rounded-full text-white font-black text-xs shadow-2xl transition-all border border-white/30 cursor-pointer overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
              boxShadow: '0 8px 24px rgba(124, 58, 237, 0.35)',
            }}
            aria-label="Do'stlik AI yordamchisi"
          >
            <div className="relative z-10 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 animate-pulse text-amber-300" />
              <span className="tracking-wide">AI Yordamchi</span>
            </div>
          </motion.button>
        </div>
      )}

      {/* AI Bottom Sheet Drawer in ~90% Slate Background with Compact No-Scroll Design */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            />

            {/* Sheet Container: Tall, scrollable pop-up screen (~85vh) with drag-to-close gesture */}
            <motion.div
              drag="y"
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0, bottom: 0.5 }}
              onDragEnd={(_e, info) => {
                if (info.offset.y > 80 || info.velocity.y > 300) {
                  handleClose();
                }
              }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative w-full max-w-md bg-slate-200 border-t border-slate-300 rounded-t-3xl p-4 sm:p-5 shadow-2xl z-10 text-slate-900 min-h-[570px] max-h-[88vh] flex flex-col justify-between overflow-y-auto"
            >
              {/* Top Drag Handle: Hold/Drag down to close */}
              <div
                onPointerDown={(e) => dragControls.start(e)}
                className="w-full pt-0.5 pb-2 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none -mt-1 shrink-0 group"
                title="Pastga tortib yopish"
              >
                <div className="w-14 h-1.5 rounded-full bg-slate-400 group-hover:bg-slate-500 transition-colors" />
              </div>

              {/* Header: Also supports holding/dragging down to close */}
              <div
                onPointerDown={(e) => {
                  if ((e.target as HTMLElement).closest('button')) return;
                  dragControls.start(e);
                }}
                className="flex items-center justify-between shrink-0 mb-1 cursor-grab active:cursor-grabbing touch-none select-none"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-md shadow-violet-700/20"
                    style={{
                      background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
                    }}
                  >
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 leading-tight">
                      Do‘stlik AI Nasiya Yordamchisi
                    </h3>
                    <p className="text-[11px] text-violet-800 font-bold flex items-center gap-1.5">
                      <span>Cheksiz Gemini AI</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  className="w-8 h-8 rounded-full bg-slate-300 hover:bg-slate-400 border border-slate-400/40 flex items-center justify-center text-slate-700 hover:text-slate-950 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 2 Options Segmented Control: Nasiya Yozish vs Qidirish & To'lash */}
              <div className="grid grid-cols-2 p-1 bg-slate-300/80 border border-slate-400/50 rounded-xl gap-1 shrink-0 mb-1">
                <button
                  type="button"
                  onClick={() => {
                    if (isListening && recognitionRef.current) {
                      isListeningRef.current = false;
                      recognitionRef.current.stop();
                    }
                    setIsListening(false);
                    setActiveMode('nasiya');
                  }}
                  className={`py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeMode === 'nasiya'
                      ? 'bg-slate-100 text-violet-800 shadow-2xs border border-slate-300'
                      : 'text-slate-700 hover:text-slate-950'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-violet-700" />
                  <span>Nasiya Yozish</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (isListening && recognitionRef.current) {
                      isListeningRef.current = false;
                      recognitionRef.current.stop();
                    }
                    setIsListening(false);
                    setActiveMode('qidirish');
                  }}
                  className={`py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeMode === 'qidirish'
                      ? 'bg-slate-100 text-violet-800 shadow-2xs border border-slate-300'
                      : 'text-slate-700 hover:text-slate-950'
                  }`}
                >
                  <Search className="w-3.5 h-3.5 text-violet-700" />
                  <span>Qidirish & To‘lash</span>
                </button>
              </div>

              {/* MODE 1: NASIYA (TALL EXPANSIVE FORM, ZERO SCROLL) */}
              {activeMode === 'nasiya' && (
                <div className="flex-1 flex flex-col justify-between space-y-2.5 pt-0.5 min-h-0">
                  {/* Omnibox / Speech Input */}
                  <div className="relative bg-slate-100 border border-slate-300 rounded-2xl p-2.5 focus-within:border-violet-600 focus-within:bg-white transition-all shadow-2xs shrink-0">
                    <textarea
                      rows={2}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Ovoz yoki matn: 'Abu qossopga 50 mingli go'sh, ertaga kechga'..."
                      className="w-full bg-transparent text-xs text-slate-900 placeholder-slate-500 resize-none focus:outline-none pr-20 font-medium leading-relaxed"
                    />

                    {/* Microphone & AI Button */}
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      {inputText.trim() && (
                        <button
                          type="button"
                          onClick={() => runAiParse(inputText)}
                          disabled={isAiThinking}
                          className="px-2 py-1 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-800 border border-violet-300 text-xs font-black cursor-pointer flex items-center gap-1 shadow-2xs"
                          title="AI Tahlil"
                        >
                          <Sparkles className="w-3 h-3 text-violet-700" />
                          <span>AI</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleSpeechRecognition('nasiya')}
                        className={`p-2 rounded-xl transition-all cursor-pointer ${
                          isListening
                            ? 'bg-rose-700 text-white animate-pulse shadow-md shadow-rose-700/50'
                            : 'bg-slate-300 text-violet-800 hover:bg-slate-400 border border-slate-400/40'
                        }`}
                        title={isListening ? 'Eshitishni to‘xtatish' : 'Ovoz bilan aytish'}
                      >
                        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Listening / Thinking feedback */}
                  {isListening && (
                    <div className="flex items-center justify-between px-3 text-rose-700 text-xs bg-rose-100/95 py-1.5 rounded-xl border border-rose-300 shrink-0">
                      <div className="flex items-center gap-2 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-rose-600" />
                        <span className="font-bold">Eshitilmoqda... Bemalol o‘ylab gapiring</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleSpeechRecognition('nasiya')}
                        className="font-black underline ml-2 text-rose-800 cursor-pointer text-xs"
                      >
                        To‘xtatish
                      </button>
                    </div>
                  )}

                  {isAiThinking && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-100 border border-violet-300 rounded-xl text-violet-900 text-xs font-bold animate-pulse shrink-0">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-700" />
                      <span>✨ Gemini AI matn va shevalarni tahlil qilmoqda...</span>
                    </div>
                  )}

                  {/* Spacious Form Fields Box */}
                  <div className="p-3.5 bg-slate-100 border border-slate-300 rounded-2xl space-y-2.5 shadow-2xs shrink-0">
                    {/* Row 1: Name and Amount */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          <span>Mijoz ismi *</span>
                        </label>
                        <input
                          type="text"
                          value={editCustomerName}
                          onChange={(e) => setEditCustomerName(e.target.value)}
                          placeholder="Akmal aka"
                          className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-violet-700 text-xs font-bold transition-colors shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                          <span>Summa (so‘m) *</span>
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={editAmount ? formatNumberWithSpaces(editAmount) : ''}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, '');
                            setEditAmount(digits);
                          }}
                          onWheel={(e) => (e.target as HTMLElement).blur()}
                          placeholder="49 000"
                          className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-violet-700 text-sm font-black transition-colors shadow-2xs"
                        />
                      </div>
                    </div>

                    {/* Row 2: Items and Phone (Optional) */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                          <Package className="w-3.5 h-3.5 text-slate-500" />
                          <span>Mahsulotlar</span>
                        </label>
                        <input
                          type="text"
                          value={editItems}
                          onChange={(e) => setEditItems(e.target.value)}
                          placeholder="2 ta non, go‘sht..."
                          className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-violet-700 text-xs font-medium transition-colors shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-500" />
                          <span>Telefon (ixtiyoriy)</span>
                        </label>
                        <input
                          type="tel"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          placeholder="90 123 45 67"
                          className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-violet-700 text-xs font-medium transition-colors shadow-2xs"
                        />
                      </div>
                    </div>

                    {/* Row 3: Qaytarish vaqti chips */}
                    <div className="flex items-center justify-between gap-1.5 pt-1">
                      <span className="text-xs font-black text-slate-800 flex items-center gap-1 shrink-0">
                        <Clock className="w-3.5 h-3.5 text-violet-700" />
                        <span>Muddat:</span>
                      </span>

                      <div className="flex items-center gap-1 flex-wrap justify-end">
                        {[
                          { id: 'today', label: 'Bugun', fn: () => { setDueType('today'); setDueDate(getTodayStr()); setEditDueCondition('Bugun'); } },
                          { id: 'tomorrow', label: 'Ertaga', fn: () => { setDueType('tomorrow'); setDueDate(getTomorrowStr()); setEditDueCondition('Ertaga'); } },
                          { id: '3days', label: '3 kunda', fn: () => { setDueType('3days'); setDueDate(getDaysLaterStr(3)); setEditDueCondition('3 kunda'); } },
                          { id: '1week', label: '1 hafta', fn: () => { setDueType('1week'); setDueDate(getDaysLaterStr(7)); setEditDueCondition('1 haftada'); } },
                          { id: 'custom', label: '📅 Sana', fn: () => { setDueType('custom'); } },
                        ].map((pill) => (
                          <button
                            key={pill.id}
                            type="button"
                            onClick={pill.fn}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              dueType === pill.id
                                ? 'bg-violet-700 text-white shadow-2xs border border-violet-800'
                                : 'bg-slate-300 border border-slate-400/40 text-slate-800 hover:bg-slate-400'
                            }`}
                          >
                            {pill.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {dueType === 'custom' && (
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => {
                          setDueDate(e.target.value);
                          setEditDueCondition(e.target.value);
                        }}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-violet-700 shadow-2xs"
                      />
                    )}

                    {/* Row 4: Auto timestamp indicator */}
                    <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-200/80 px-3 py-1.5 rounded-xl border border-slate-300">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Clock className="w-3.5 h-3.5 text-violet-700" />
                        <span>Yozilish: Shu lahzada ({new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })})</span>
                      </span>
                      <span className="font-black text-violet-900">
                        {dueType === 'tomorrow' ? 'Ertaga' : dueType === 'today' ? 'Bugun' : dueType === '3days' ? '3 kunda' : dueType === '1week' ? '1 haftada' : dueDate}
                      </span>
                    </div>
                  </div>

                  {/* Prominent Direct Save Button */}
                  <button
                    type="button"
                    disabled={isSaving || !editCustomerName.trim() || !editAmount || Number(editAmount) <= 0}
                    onClick={handleDirectSave}
                    className="w-full py-3 px-4 bg-violet-700 hover:bg-violet-800 active:bg-violet-900 disabled:opacity-40 text-white rounded-2xl font-black text-sm shadow-lg shadow-violet-900/30 border border-violet-800/50 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] shrink-0"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Daftarga yozilmoqda...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Daftarga yozish {Number(editAmount) > 0 ? `(${formatMoney(Number(editAmount))})` : ''}</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* MODE 2: QIDIRISH & TO'LASH (VOICE / TEXT SEARCH) */}
              {activeMode === 'qidirish' && (
                <div className="flex-1 flex flex-col space-y-2.5 pt-0.5 min-h-0">
                  {/* Search Omnibox */}
                  <div className="relative bg-slate-100 border border-slate-300 rounded-2xl p-2.5 flex items-center gap-2 focus-within:border-violet-600 focus-within:bg-white transition-all shadow-2xs shrink-0">
                    <Search className="w-4 h-4 text-slate-500 ml-0.5 shrink-0" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Ovoz yoki yozuv: '50 ming' yoki 'Abu qossob'..."
                      className="w-full bg-transparent text-xs text-slate-900 placeholder-slate-500 font-medium focus:outline-none"
                    />

                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="p-1 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Microphone for search */}
                    <button
                      type="button"
                      onClick={() => toggleSpeechRecognition('qidirish')}
                      className={`p-2 rounded-xl transition-all shrink-0 cursor-pointer ${
                        isListening
                          ? 'bg-rose-700 text-white animate-pulse shadow-md shadow-rose-700/50'
                          : 'bg-slate-300 text-violet-800 hover:bg-slate-400 border border-slate-400/40'
                      }`}
                      title={isListening ? 'Eshitishni to‘xtatish' : 'Ovoz bilan qidirish'}
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                  </div>

                  {isListening && (
                    <div className="flex items-center justify-between px-3 text-rose-700 text-xs bg-rose-100/95 py-1.5 rounded-xl border border-rose-300 shrink-0">
                      <div className="flex items-center gap-2 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-rose-600" />
                        <span className="font-semibold">Gapiring: "50 ming", "qossob", "rosil" yoki mijoz ismini ayting...</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleSpeechRecognition('qidirish')}
                        className="font-bold underline ml-2 text-rose-800 cursor-pointer text-xs"
                      >
                        To‘xtatish
                      </button>
                    </div>
                  )}

                  {/* Results Count */}
                  <div className="flex items-center justify-between text-xs text-slate-600 px-1 font-semibold shrink-0">
                    <span>
                      {searchQuery
                        ? `Topilgan qarzlar: ${matchingEntries.length} ta`
                        : 'Oxirgi qarzlar:'}
                    </span>
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="text-violet-800 font-bold hover:underline cursor-pointer"
                      >
                        Tozalash
                      </button>
                    )}
                  </div>

                  {/* Matching Entries List */}
                  {isLoadingEntries ? (
                    <div className="flex-1 flex justify-center items-center text-slate-500 py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-violet-700" />
                    </div>
                  ) : matchingEntries.length === 0 ? (
                    <div className="flex-1 flex justify-center items-center text-center text-xs font-semibold text-slate-600 bg-slate-100 rounded-2xl border border-slate-300 p-6">
                      "{searchQuery}" bo‘yicha qarz topilmadi.
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-0">
                      {matchingEntries.map((entry) => {
                        const isOpen = entry.status === 'open';

                        return (
                          <div
                            key={entry.id}
                            className={`p-3 bg-slate-50 border rounded-2xl space-y-2 transition-all shadow-2xs ${
                              isOpen ? 'border-rose-300/90' : 'border-emerald-300/90'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                                  <span>{entry.party_name}</span>
                                  {isOpen ? (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300 font-bold">
                                      Ochiq
                                    </span>
                                  ) : (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                                      To‘langan
                                    </span>
                                  )}
                                </h4>
                                <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2 font-medium">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-slate-400" />
                                    <span>{formatDate(entry.created_at)}</span>
                                  </span>
                                  {entry.description && (
                                    <span className="truncate max-w-[150px] text-slate-600 font-semibold">
                                      {entry.description}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <span
                                className={`font-black text-xs ${
                                  isOpen ? 'text-rose-700' : 'text-emerald-700'
                                }`}
                              >
                                {formatMoney(entry.amount)}
                              </span>
                            </div>

                            {/* Quick Action Button: Only To'lash (Users cannot delete records) */}
                            {isOpen && (
                              <div className="flex items-center justify-end gap-2 pt-1.5 border-t border-slate-200">
                                <button
                                  type="button"
                                  disabled={isSettlingId === entry.id}
                                  onClick={() => handleSettleEntry(entry)}
                                  className="px-3 py-1.5 text-xs font-black text-white bg-emerald-700 hover:bg-emerald-800 border border-emerald-800 rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-2xs"
                                >
                                  {isSettlingId === entry.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5" />
                                  )}
                                  <span>To‘lash</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
