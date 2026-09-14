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
  Users,
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
import { Entry, CustomerSummary } from '../../types/database';
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
  prefillCustomer?: { name: string; phone?: string | null } | null;
}

export const FloatingAIButton: React.FC<FloatingAIButtonProps> = ({
  isOpen: externalIsOpen,
  onOpen: externalOnOpen,
  onClose: externalOnClose,
  onNavigate: _onNavigate,
  showFloatingTrigger = false,
  prefillCustomer = null,
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
  // Multi-stage AI reasoning state: 'idle' | 'listening' | 'analyzing' | 'grouping' | 'review'
  const [aiStage, setAiStage] = useState<'idle' | 'listening' | 'analyzing' | 'grouping' | 'review'>('idle');
  const spokenBufferRef = useRef<string>('');

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
  const inputTextRef = useRef<string>('');
  const aiTimerRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const dragControls = useDragControls();

  // Customer autocomplete & suggestions state
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomerMeta, setSelectedCustomerMeta] = useState<CustomerSummary | null>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch customer summaries for smart autocomplete & debt accumulation
  const { data: customerSummaries = [] } = useQuery({
    queryKey: ['customerSummaries'],
    queryFn: () => entriesService.getCustomerSummaries('highest'),
    enabled: isOpen,
  });

  // Handle prefillCustomer prop if opened from Customer page / Ledger
  useEffect(() => {
    if (prefillCustomer) {
      setEditCustomerName(prefillCustomer.name);
      if (prefillCustomer.phone) {
        setEditPhone(prefillCustomer.phone);
      }
      setActiveMode('nasiya');
      const match = customerSummaries.find(
        (c) => c.customer_name.trim().toLowerCase() === prefillCustomer.name.trim().toLowerCase()
      );
      if (match) {
        setSelectedCustomerMeta(match);
      }
      setTimeout(() => {
        amountInputRef.current?.focus();
      }, 100);
    }
  }, [prefillCustomer, customerSummaries]);

  // Sync selectedCustomerMeta when editCustomerName changes
  useEffect(() => {
    const trimmed = editCustomerName.trim();
    if (!trimmed) {
      setSelectedCustomerMeta(null);
      return;
    }
    const match = findMatchingExistingCustomer(trimmed);
    setSelectedCustomerMeta(match);
  }, [editCustomerName, customerSummaries]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter matching suggestions when typing name or nickname
  const customerSuggestions = useMemo(() => {
    const q = editCustomerName.trim().toLowerCase();
    if (!q) {
      // Top customers with open debts for quick-pick
      return customerSummaries.filter((c) => c.total_debt > 0).slice(0, 4);
    }

    return customerSummaries
      .filter((c) => {
        const cName = c.customer_name.toLowerCase();
        const cPhone = (c.customer_phone || '').toLowerCase();

        // 1. Direct substring match on full name or phone
        if (cName.includes(q) || cPhone.includes(q)) return true;

        // 2. Fuzzy Uzbek match on full name
        if (fuzzyMatchUzbek(q, c.customer_name)) return true;

        // 3. Match individual words / tokens (e.g. "qassob", "usta", "qo'shni", "traktorchi", "sartarosh")
        const tokens = cName.split(/[\s(),'‘`"/-]+/).filter((t) => t.length >= 2);
        if (tokens.some((token) => token.includes(q) || fuzzyMatchUzbek(q, token))) {
          return true;
        }

        return false;
      })
      .slice(0, 5);
  }, [editCustomerName, customerSummaries]);

  // Find best matching customer for voice/AI parsing
  const findMatchingExistingCustomer = (inputName: string): CustomerSummary | null => {
    const q = inputName.trim().toLowerCase();
    if (!q || q === 'mijoz') return null;

    // 1. Exact match
    const exact = customerSummaries.find((c) => c.customer_name.trim().toLowerCase() === q);
    if (exact) return exact;

    // 2. Word boundary match (e.g. "Farhod" matches "Farhod aka" or "Farhod Toshkent", but NEVER "Ali" matching "Alisher")
    const boundaryMatch = customerSummaries.find((c) => {
      const cName = c.customer_name.trim().toLowerCase();
      if (cName.startsWith(q + ' ') || cName.endsWith(' ' + q) || cName.includes(' ' + q + ' ')) {
        return true;
      }
      if (q.startsWith(cName + ' ') || q.endsWith(' ' + cName) || q.includes(' ' + cName + ' ')) {
        return true;
      }
      return false;
    });
    if (boundaryMatch) return boundaryMatch;

    // 3. Token / nickname exact or phonetic match
    const tokenMatch = customerSummaries.find((c) => {
      const tokens = c.customer_name.toLowerCase().split(/[\s(),'‘`"/-]+/).filter((t) => t.length >= 2);
      return tokens.some((t) => t === q || fuzzyMatchUzbek(q, t));
    });
    if (tokenMatch) return tokenMatch;

    // 4. Fuzzy match with phonetic checking
    const fuzzy = customerSummaries.find((c) => fuzzyMatchUzbek(q, c.customer_name));
    return fuzzy || null;
  };


  const handleSelectCustomer = (cust: CustomerSummary) => {
    setEditCustomerName(cust.customer_name);
    if (cust.customer_phone) {
      setEditPhone(cust.customer_phone);
    }
    setSelectedCustomerMeta(cust);
    setShowCustomerDropdown(false);
    setTimeout(() => {
      amountInputRef.current?.focus();
    }, 50);
  };

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

  // Parse text using Gemini AI with fallback to Turbo Engine (Multi-stage reasoning)
  const runAiParse = async (rawText: string) => {
    const text = rawText.trim();
    if (!text) {
      setAiStage('idle');
      return;
    }

    // Stage 1: Analyzing
    setAiStage('analyzing');
    setIsAiThinking(true);

    // Short pause so user sees and feels the AI carefully thinking and analyzing pure Uzbek words
    await new Promise((r) => setTimeout(r, 600));

    let parsedResult: {
      customer_name?: string;
      amount?: number;
      items?: string;
      phone?: string | null;
      due_condition?: string;
    } | null = null;

    try {
      // 1. Try Google Gemini AI first
      const geminiData = await parseNasiyaWithGemini(text);
      if (geminiData && (geminiData.customer_name || geminiData.amount > 0)) {
        parsedResult = geminiData;
      }
    } catch (err) {
      console.warn('Gemini AI parse error, fallback to local turbo:', err);
    }

    // 2. Fallback to Local Turbo Engine if Gemini did not respond
    if (!parsedResult) {
      const res = parseTurboNasiyaText(text);
      if (res.transactions.length > 0) {
        const t = res.transactions[0];
        const itemsStr = t.items && t.items.length > 0
          ? t.items.map((it) => `${it.quantity ? it.quantity + ' ' : ''}${it.unit ? it.unit + ' ' : ''}${it.name}`).join(', ')
          : '';
        const phoneMatch = text.match(/(?:\+?998)?[ -]?(?:9[01345789]|33|88|99)[ -]?\d{3}[ -]?\d{2}[ -]?\d{2}/);

        parsedResult = {
          customer_name: t.customer_name,
          amount: t.amount,
          items: itemsStr,
          due_condition: t.due_condition || 'Bugun',
          phone: phoneMatch ? phoneMatch[0].trim() : null,
        };
      }
    }

    // Stage 2: Grouping
    setAiStage('grouping');
    await new Promise((r) => setTimeout(r, 500));

    if (parsedResult) {
      if (parsedResult.customer_name && parsedResult.customer_name !== 'Mijoz') {
        const matched = findMatchingExistingCustomer(parsedResult.customer_name);
        if (matched) {
          setEditCustomerName(matched.customer_name);
          if (matched.customer_phone && !editPhone) {
            setEditPhone(matched.customer_phone);
          }
          setSelectedCustomerMeta(matched);
        } else {
          setEditCustomerName(parsedResult.customer_name);
        }
      }
      if (parsedResult.amount && parsedResult.amount > 0) {
        setEditAmount(String(parsedResult.amount));
      }
      if (parsedResult.items) {
        setEditItems(parsedResult.items);
      }
      if (parsedResult.phone) {
        setEditPhone(parsedResult.phone);
      }
      if (parsedResult.due_condition) {
        setEditDueCondition(parsedResult.due_condition);
        const cond = parsedResult.due_condition.toLowerCase();
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
    }

    setIsAiThinking(false);
    // Stage 3: Ready for confirmation review
    setAiStage('review');
  };

  // Keep inputTextRef synced with inputText
  useEffect(() => {
    inputTextRef.current = inputText;
  }, [inputText]);

  // Debounced AI parser on inputText change (active during typing, avoids duplicate triggers during speech)
  useEffect(() => {
    if (!inputText.trim()) {
      return;
    }

    // Instant local regex preview (0ms latency)
    const localRes = parseTurboNasiyaText(inputText);
    if (localRes.transactions.length > 0) {
      const t = localRes.transactions[0];
      if (t.customer_name && t.customer_name !== 'Mijoz' && !editCustomerName) {
        const matched = findMatchingExistingCustomer(t.customer_name);
        if (matched) {
          setEditCustomerName(matched.customer_name);
          setSelectedCustomerMeta(matched);
        } else {
          setEditCustomerName(t.customer_name);
        }
      }
      if (t.amount > 0 && !editAmount) {
        setEditAmount(String(t.amount));
      }
    }

    // If currently recording voice, do not fire Gemini AI on intermediate syllables
    if (isListeningRef.current) return;

    // Debounced full Gemini AI parsing (relaxed 1.6s so AI works slower and lets user finish typing)
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    aiTimerRef.current = setTimeout(() => {
      runAiParse(inputText);
    }, 1600);

    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, [inputText]);

  // Clean Web Speech API Voice Recognition (Robust continuous capture, generous silence allowance)
  const toggleSpeechRecognition = (target: 'nasiya' | 'qidirish') => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showToast('Brauzeringiz ovozli yozishni qo‘llab-quvvatlamaydi. Matn kiriting.', 'info');
      return;
    }

    // If already active, manually stop
    if (isListening) {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
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
      if (target === 'nasiya') {
        setAiStage('listening');
        spokenBufferRef.current = '';
      }

      // Set initial generous 8-second grace period for the user to start speaking
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        if (isListeningRef.current && recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch {}
        }
      }, 8000);

      recognition.onresult = (event: any) => {
        let fullTranscript = '';
        // Loop from 0 to results.length so NO previous words are dropped or cut off!
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript + ' ';
        }

        const trimmed = fullTranscript.trim();
        if (target === 'nasiya') {
          // Keep in hidden buffer so words do not blink/distract user during speech
          spokenBufferRef.current = trimmed;
        } else {
          setSearchQuery(trimmed);
        }

        // Reset silence timer: allow 3.5 full seconds of pause before concluding
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (isListeningRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.stop();
            } catch {}
          }
        }, 3500);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition status/error:', event.error);
        if (event.error === 'not-allowed') {
          showToast('Mikrofon ruxsati berilmadi. Sozlamalardan mikrofonni yoqing.', 'error');
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          isListeningRef.current = false;
          setIsListening(false);
          setAiStage('idle');
        }
      };

      recognition.onend = () => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        isListeningRef.current = false;
        setIsListening(false);
        // When speech finishes, reveal transcription and trigger multi-stage AI reasoning calmly
        if (target === 'nasiya') {
          const finalSpoken = spokenBufferRef.current.trim();
          if (finalSpoken) {
            setInputText(finalSpoken);
            runAiParse(finalSpoken);
          } else {
            setAiStage('idle');
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Speech recognition init error:', err);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
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
    // If an existing customer was matched, use their canonical customer_name so all entries aggregate to that person!
    const customer = (selectedCustomerMeta ? selectedCustomerMeta.customer_name : editCustomerName).trim();
    const phoneToSave = editPhone.trim() || (selectedCustomerMeta?.customer_phone || null);

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
      const adminId = profile?.id || '00000000-0000-0000-0000-000000000003';
      const adminName = profile?.full_name || 'Abubakir';
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
          party_phone: phoneToSave,
          amount: numAmount,
          direction: 'customer',
          status: 'open',
          due_date: finalDueDate,
          description,
          paid_at: null,
          created_by: adminId,
          recorded_by_name: adminName,
          last_edited_by: adminId,
        },
        { id: adminId, name: adminName }
      );

      await queryClient.invalidateQueries({ queryKey: ['entries'] });
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      await queryClient.invalidateQueries({ queryKey: ['customerSummaries'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      await queryClient.invalidateQueries({ queryKey: ['adminLogs'] });

      showToast(`✅ ${customer} daftariga ${formatMoney(numAmount)} muvaffaqiyatli yozildi!`, 'success');
      setInputText('');
      setEditCustomerName('');
      setSelectedCustomerMeta(null);
      setShowCustomerDropdown(false);
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
      const adminId = profile?.id || '00000000-0000-0000-0000-000000000002';
      const adminName = profile?.full_name || 'Sayfullo';
      await entriesService.payOrReduceDebt(
        entry.id,
        currentAmount,
        { id: adminId, name: adminName },
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
                  {/* Omnibox / Speech Input (Expanded Spacious Box) */}
                  <div className="relative bg-slate-100 border border-slate-300 rounded-2xl p-3 sm:p-3.5 focus-within:border-violet-600 focus-within:bg-white transition-all shadow-2xs shrink-0">
                    {isListening ? (
                      /* Calm voice recording screen - spacious, comfortable and unhurried */
                      <div className="min-h-[84px] p-3 flex items-center justify-between bg-violet-50/90 border border-violet-200 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="relative flex items-center justify-center w-6 h-6">
                            <span className="w-4 h-4 rounded-full bg-rose-600 animate-ping absolute" />
                            <span className="w-3.5 h-3.5 rounded-full bg-rose-600 relative" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900 leading-tight">
                              Eshitilmoqda... Bemalol gapiring
                            </p>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                              Gapirib bo‘lgach, AI to‘liq tahlil qilib beradi
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                            isListeningRef.current = false;
                            setIsListening(false);
                            if (recognitionRef.current) {
                              try { recognitionRef.current.stop(); } catch {}
                            }
                            const finalSpoken = spokenBufferRef.current.trim();
                            if (finalSpoken) {
                              setInputText(finalSpoken);
                              runAiParse(finalSpoken);
                            } else {
                              setAiStage('idle');
                            }
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-3.5 py-2 rounded-xl text-xs cursor-pointer shadow-sm transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Tayyor ✅</span>
                        </button>
                      </div>
                    ) : (
                      <textarea
                        rows={3}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Ovoz yoki matn: 'Farhod oka 30 000', 'Abu qossopga 50 ming go'sh'..."
                        className="w-full min-h-[80px] bg-transparent text-sm text-slate-900 placeholder-slate-400 resize-none focus:outline-none pr-14 font-medium leading-relaxed"
                      />
                    )}

                    {/* Microphone & AI Button (when not listening) */}
                    {!isListening && (
                      <div className="absolute right-3 top-3 flex flex-col items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleSpeechRecognition('nasiya')}
                          className="p-2.5 rounded-xl transition-all cursor-pointer bg-violet-700 text-white hover:bg-violet-800 shadow-md shadow-violet-700/30 border border-violet-800 active:scale-95"
                          title="Ovoz bilan aytish"
                        >
                          <Mic className="w-4 h-4" />
                        </button>
                        {inputText.trim() && (
                          <button
                            type="button"
                            onClick={() => runAiParse(inputText)}
                            disabled={isAiThinking}
                            className="px-2 py-1 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-800 border border-violet-300 text-[11px] font-black cursor-pointer flex items-center gap-0.5 shadow-2xs"
                            title="AI Tahlil"
                          >
                            <Sparkles className="w-3 h-3 text-violet-700" />
                            <span>AI</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Multi-stage AI Reasoning Status Line */}
                  <div className="min-h-[28px] flex items-center justify-between text-xs shrink-0 px-1">
                    {aiStage === 'listening' ? (
                      <div className="flex items-center gap-2 text-violet-900 text-xs font-bold w-full bg-violet-100/90 border border-violet-300 px-3 py-1 rounded-xl">
                        <Mic className="w-3.5 h-3.5 text-violet-700 animate-pulse shrink-0" />
                        <span className="truncate">Ovoz yozilmoqda... Tugatgach "Tayyor"ni bosing</span>
                      </div>
                    ) : aiStage === 'analyzing' ? (
                      <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 border border-amber-300 rounded-xl text-amber-900 text-xs font-black w-full animate-pulse">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700 shrink-0" />
                        <span className="truncate">1-bosqich: Ovoz va so‘zlar tahlil qilinmoqda...</span>
                      </div>
                    ) : aiStage === 'grouping' ? (
                      <div className="flex items-center gap-2 px-3 py-1 bg-sky-100 border border-sky-300 rounded-xl text-sky-900 text-xs font-black w-full animate-pulse">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-700 shrink-0" />
                        <span className="truncate">2-bosqich: Mijoz, summa va muddat guruhlanmoqda...</span>
                      </div>
                    ) : aiStage === 'review' ? (
                      <div className="flex items-center gap-2 px-3 py-1 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-black w-full">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span className="truncate">3-bosqich: AI tushundi! Maʼlumotlarni tekshiring va tasdiqlang:</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-500 font-medium">
                        💡 Masalan: "Farhod oka 30 000" yoki mikrofonni bosing
                      </span>
                    )}
                  </div>

                  {/* Spacious Form Fields Box */}
                  <div className="p-3.5 bg-slate-100 border border-slate-300 rounded-2xl space-y-2.5 shadow-2xs shrink-0">
                    {/* Row 1: Name (with smart autocomplete) and Amount */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Customer Name input with rich autocomplete dropdown */}
                      <div className="relative" ref={dropdownRef}>
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-500" />
                            <span>Mijoz ismi *</span>
                          </label>
                          {selectedCustomerMeta && (
                            <span className="text-[10px] text-emerald-700 font-black flex items-center gap-0.5">
                              <Check className="w-3 h-3" />
                              <span>Mavjud</span>
                            </span>
                          )}
                        </div>

                        <div className="relative">
                          <input
                            type="text"
                            value={editCustomerName}
                            onFocus={() => setShowCustomerDropdown(true)}
                            onChange={(e) => {
                              setEditCustomerName(e.target.value);
                              setShowCustomerDropdown(true);
                            }}
                            placeholder="Ism yoki laqab (masalan: Qassob, Qo'shni)..."
                            className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-violet-700 text-xs font-bold transition-colors shadow-2xs pr-7"
                          />
                          {editCustomerName && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditCustomerName('');
                                setSelectedCustomerMeta(null);
                                setShowCustomerDropdown(true);
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                              title="Tozalash"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Customer Autocomplete Dropdown */}
                        {showCustomerDropdown && customerSuggestions.length > 0 && (
                          <div className="absolute left-0 w-[240px] sm:w-[280px] top-full mt-1.5 bg-white border-2 border-violet-600 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto">
                            <div className="p-2 bg-violet-50/95 border-b border-violet-100 flex items-center justify-between text-[10.5px] font-bold text-violet-900">
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3 text-violet-700" />
                                <span>Tavsiya etilgan mijozlar:</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => setShowCustomerDropdown(false)}
                                className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>

                            {customerSuggestions.map((cust) => {
                              const isSelected =
                                cust.customer_name.toLowerCase() === editCustomerName.trim().toLowerCase();

                              return (
                                <button
                                  key={cust.customer_name}
                                  type="button"
                                  onClick={() => handleSelectCustomer(cust)}
                                  className={`w-full p-2.5 text-left flex items-center justify-between gap-2 hover:bg-violet-50 transition-colors cursor-pointer ${
                                    isSelected ? 'bg-violet-100/70' : ''
                                  }`}
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="font-black text-slate-900 text-xs truncate">
                                      {cust.customer_name}
                                    </div>
                                    {cust.customer_phone ? (
                                      <span className="text-[10px] text-slate-500 font-mono block">
                                        {cust.customer_phone}
                                      </span>
                                    ) : (
                                      <span className="text-[9.5px] text-slate-400 italic block">
                                        Telefon kiritilmagan
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-right shrink-0">
                                    <span className="text-xs font-black text-rose-700 block">
                                      {formatMoney(cust.total_debt)}
                                    </span>
                                    <span className="text-[9.5px] text-slate-500 font-bold block">
                                      {cust.open_entries_count} ta ochiq
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Amount Input */}
                      <div>
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                          <span>Summa (so‘m) *</span>
                        </label>
                        <input
                          ref={amountInputRef}
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

                    {/* Notification Banner when customer is selected */}
                    {selectedCustomerMeta && (
                      <div className="p-2.5 bg-violet-100/95 border border-violet-300 rounded-xl flex items-center justify-between text-xs text-violet-950 shadow-2xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <Users className="w-4 h-4 text-violet-700 shrink-0" />
                          <div className="truncate">
                            <span className="font-black text-slate-900">
                              {selectedCustomerMeta.customer_name}
                            </span>
                            <span className="text-slate-600 ml-1.5 font-medium">
                              • Mavjud qarz: <strong className="text-rose-700 font-black">{formatMoney(selectedCustomerMeta.total_debt)}</strong> ({selectedCustomerMeta.open_entries_count} ta ochiq)
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] bg-violet-700 text-white font-black px-2 py-0.5 rounded-md shrink-0 shadow-2xs">
                          Bunga qo‘shiladi
                        </span>
                      </div>
                    )}

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

                  {/* Prominent Direct Save & Confirm Button */}
                  <button
                    type="button"
                    disabled={isSaving || !editCustomerName.trim() || !editAmount || Number(editAmount) <= 0}
                    onClick={handleDirectSave}
                    className={`w-full py-3.5 px-4 text-white rounded-2xl font-black text-sm shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] shrink-0 ${
                      editCustomerName.trim() && Number(editAmount) > 0
                        ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-emerald-800/30 border border-emerald-500'
                        : 'bg-violet-700 hover:bg-violet-800 active:bg-violet-900 disabled:opacity-40 shadow-violet-900/30 border border-violet-800/50'
                    }`}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Daftarga yozilmoqda...</span>
                      </>
                    ) : editCustomerName.trim() && Number(editAmount) > 0 ? (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Tasdiqlash va Saqlash ({formatMoney(Number(editAmount))})</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Daftarga yozish</span>
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
                          ? 'bg-rose-700 text-white shadow-md shadow-rose-700/50'
                          : 'bg-slate-300 text-violet-800 hover:bg-slate-400 border border-slate-400/40'
                      }`}
                      title={isListening ? 'Eshitishni to‘xtatish' : 'Ovoz bilan qidirish'}
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Stable search status line (zero layout trembling) */}
                  <div className="min-h-[26px] flex items-center justify-between text-xs shrink-0 px-1">
                    {isListening ? (
                      <div className="flex items-center justify-between text-rose-700 bg-rose-100/90 border border-rose-300 px-3 py-0.5 rounded-xl w-full gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping shrink-0" />
                          <span className="font-semibold truncate">Ovoz bilan qidirilmoqda...</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                              isListeningRef.current = false;
                              setIsListening(false);
                              if (recognitionRef.current) {
                                try { recognitionRef.current.stop(); } catch {}
                              }
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-2 py-0.5 rounded-lg text-xs cursor-pointer shadow-xs"
                          >
                            Tayyor ✅
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleSpeechRecognition('qidirish')}
                            className="font-bold text-rose-800 hover:underline cursor-pointer text-[11px]"
                          >
                            To‘xtatish
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-500 font-medium">
                        Mijoz ismi, laqabi (qassob, usta) yoki mahsulot nomi bo‘yicha
                      </span>
                    )}
                  </div>

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
