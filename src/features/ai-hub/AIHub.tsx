import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import {
  Sparkles, FileText, Image, Languages, BarChart3,
  Send, Brain, User
} from 'lucide-react';
import { useLanguage } from '@context/LanguageContext';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function AIHub() {
  const { t, language } = useLanguage();

  const presetPrompts = [
    { icon: FileText, label: t('ai.preset1_label'), prompt: t('ai.preset1_prompt') },
    { icon: BarChart3, label: t('ai.preset2_label'), prompt: t('ai.preset2_prompt') },
    { icon: Image, label: t('ai.preset3_label'), prompt: t('ai.preset3_prompt') },
    { icon: Languages, label: t('ai.preset4_label'), prompt: t('ai.preset4_prompt') },
  ];

  const mockResponsesRu: Record<string, string> = {
    'Напиши продающее описание товара для сетевого зарядного устройства 20W PD с выходом USB-C, белого цвета, в премиальном алюминиевом корпусе': `Премиальный сетевой адаптер 20W PD

Ключевые характеристики:
• Мощность: 20 Вт, поддержка Power Delivery
• Разъём: USB-C
• Материал: алюминиевый корпус, белое покрытие
• Технология: GaN — эффективное охлаждение

Описание:
Ощутите сверхскоростную зарядку с нашим компактным адаптером. Идеально подходит для iPhone, iPad и всех USB-C устройств. Компактный размер и премиальный дизайн делают его незаменимым спутником в поездках.

Преимущества:
— Быстрая зарядка с PD-протоколом до 20 Вт
— Алюминиевый корпус — премиальный вид и теплоотвод
— GaN-технология для компактности без перегрева`,
    'Переведи это название товара на английский язык: "Премиальный плетеный кабель USB-C — Lightning, 1 м, черный, 20 Вт PD"': `Premium Braided USB-C to Lightning Cable, 1m, Black, 20W PD`,
    'Проанализируй структуру SKU S10002E-2/01 и объясни каждый сегмент': `Разбор артикула: S10002E-2/01

Сегменты:
• S — Префикс бренда (GQbox)
• 10002 — Базовый номер товара (категория кабелей)
• E — Модификация модели (линейка ZS)
• -2 — Вариация длины (2 метра)
• /01 — Код цвета (Черный)

Этот SKU обозначает двухметровый черный кабель стандарта ZS.`,
    'Создай детализированный промпт для нейросети для генерации студийной фотографии белой беспроводной зарядной станции 3-в-1': `Professional product photography, white wireless charging station, 3-in-1 design, minimalist aesthetic, soft studio lighting, clean white background, Apple-style presentation, high detail, 8K quality, subtle shadows, premium materials visible, aluminum alloy body, Qi charging indicator light`,
  };

  const mockResponsesEn: Record<string, string> = {
    'Write a compelling product description for a 20W PD wall charger with USB-C output, white color, premium aluminum body': `Premium 20W PD Wall Charger

Key Specifications:
• Power: 20W with Power Delivery support
• Connector: USB-C
• Material: Aluminum alloy, white finish
• Technology: GaN — efficient cooling

Description:
Experience lightning-fast charging with our compact wall adapter. Perfect for iPhone, iPad, and all USB-C devices. Compact size and premium design make it an ideal travel companion.

Highlights:
— Fast charging with PD protocol up to 20W
— Aluminum body — premium look and heat dissipation
— GaN technology for compact size without overheating`,
    'Translate this product title to Russian: "Premium Braided USB-C to Lightning Cable, 1m, Black, 20W PD"': `Премиальный плетеный кабель USB-C — Lightning, 1 м, черный, 20 Вт PD`,
    'Analyze the SKU pattern S10002E-2/01 and explain each segment': `SKU Breakdown: S10002E-2/01

Segments:
• S — Brand prefix (GQbox)
• 10002 — Base product number (cable category)
• E — Model variant (ZS line)
• -2 — Length variant (2 meters)
• /01 — Color code (Black)

This SKU represents a 2-meter black ZS-standard cable.`,
    'Create a detailed AI image generation prompt for a product photo of a white wireless charging station': `Professional product photography, white wireless charging station, 3-in-1 design, minimalist aesthetic, soft studio lighting, clean white background, Apple-style presentation, high detail, 8K quality, subtle shadows, premium materials visible, aluminum alloy body, Qi charging indicator light`,
  };

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = pendingCount > 0;

  useEffect(() => {
    if (!scrollRef.current) return;
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, [messages]);

  useEffect(() => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: t('ai.welcome'),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      },
    ]);
  }, [language]);

  const handleSend = async (text: string = input) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setPendingCount(prev => prev + 1);

    setTimeout(() => {
      const responses = language === 'ru' ? mockResponsesRu : mockResponsesEn;
      const defaultResponse = t('ai.default_response').replace('{query}', text.slice(0, 50));

      const response = responses[text] || defaultResponse;

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, aiMsg]);
      setPendingCount(prev => prev - 1);
    }, 1200);
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => {
      setCopiedId(null);
      copyTimerRef.current = null;
    }, 2000);
  };

  const showSuggestions = messages.length <= 1;
  const rootRef = useRef<HTMLDivElement>(null);
  const [rootHeight, setRootHeight] = useState('auto');

  useLayoutEffect(() => {
    const update = () => {
      if (!rootRef.current) return;
      const rect = rootRef.current.getBoundingClientRect();
      const parent = rootRef.current.parentElement;
      const padBot = parent ? parseFloat(getComputedStyle(parent).paddingBottom) || 0 : 0;
      setRootHeight(`${Math.floor(window.innerHeight - rect.top - padBot)}px`);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return (
    <div ref={rootRef} className="flex flex-col" style={{ height: rootHeight }}>
      {/* Header — desktop only, OUTSIDE glass */}
      <div className="hidden sm:flex items-start justify-between gap-2 flex-shrink-0 mb-3 sm:mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gradient">{t('ai.title')}</h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">{t('ai.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3 p-2 rounded-lg bg-bg-tertiary border border-border-subtle flex-shrink-0">
          <Brain className="w-3.5 h-3.5 text-accent" />
          <span className="text-[10px] text-text-secondary">GPT-4o</span>
        </div>
      </div>

      {/* Glass container — messages + input only */}
      <div className="flex-1 flex flex-col glass rounded-xl overflow-hidden min-h-0">

        {/* Messages — scrollable, fills remaining space */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-4">
          <div className="space-y-3 sm:space-y-4">

            {/* Group consecutive same-role messages — avatar on first, timestamp on last */}
            {(function renderGroups() {
              const groups: { msgs: ChatMessage[] }[] = [];
              messages.forEach(msg => {
                const last = groups[groups.length - 1];
                if (last && last.msgs[0].role === msg.role) {
                  last.msgs.push(msg);
                } else {
                  groups.push({ msgs: [msg] });
                }
              });
              const lastUserIdx = messages.map(m => m.role).lastIndexOf('user');
              const lastAssistantIdx = messages.map(m => m.role).lastIndexOf('assistant');
              return groups.map(group =>
                group.msgs.map((msg, idx) => {
                  const isLastInGroup = idx === group.msgs.length - 1;
                  const globalIdx = messages.findIndex(m => m.id === msg.id);
                  const alwaysShow = globalIdx === lastUserIdx || globalIdx === lastAssistantIdx;
                  return (
                    <div key={msg.id} className={`flex gap-2 sm:gap-3 group ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`max-w-[85%] sm:max-w-[75%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                        <div className={`flex gap-2 sm:gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                          {isLastInGroup ? (
                            <div className="hidden sm:flex w-6 sm:w-7 h-6 sm:h-7 rounded-full items-center justify-center flex-shrink-0 self-end bg-bg-elevated border border-border-subtle">
                              {msg.role === 'user' ? <User className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-accent" /> : <Sparkles className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-accent" />}
                            </div>
                          ) : (
                            <div className="hidden sm:block w-6 sm:w-7 flex-shrink-0" />
                          )}
                          <div className={`min-w-0 p-2.5 sm:p-3 rounded-xl text-xs sm:text-sm whitespace-pre-wrap break-words text-left ${
                            msg.role === 'user'
                              ? 'bg-accent/15 border border-accent/30 text-text-primary'
                              : 'bg-bg-tertiary border border-border-subtle text-text-primary'
                          }`}>
                            {msg.content}
                          </div>
                        </div>
                        <div className={`flex items-center gap-1.5 mt-0.5 ${msg.role === 'user' ? 'justify-end sm:mr-[2.5rem]' : 'justify-start sm:ml-[2.5rem]'} min-h-[14px] sm:min-h-[16px] ${alwaysShow ? '' : 'opacity-0 group-hover:opacity-100 transition-opacity'}`}>
                          {isLastInGroup && (
                            <span className="text-[9px] sm:text-[10px] text-text-muted leading-none">{msg.timestamp}</span>
                          )}
                          <button
                            onClick={() => handleCopy(msg.id, msg.content)}
                            className="text-[9px] sm:text-[10px] text-text-muted hover:text-text-secondary leading-none cursor-pointer"
                          >
                            {copiedId === msg.id ? t('ai.copied') : t('ai.copy')}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              );
            })()}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex gap-2 sm:gap-3">
                <div className="hidden sm:flex w-6 sm:w-7 h-6 sm:h-7 rounded-full items-center justify-center flex-shrink-0 self-end bg-bg-elevated border border-border-subtle">
                  <Sparkles className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-accent animate-pulse" />
                </div>
                <div className="bg-bg-tertiary border border-border-subtle rounded-xl p-2.5 sm:p-3">
                  <div className="flex gap-1">
                    <div className="w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Suggested prompts — fixed above input */}
        {showSuggestions && (
          <div className="flex-shrink-0 px-3 sm:px-4 pb-2 flex flex-col items-end gap-1.5">
            {presetPrompts.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handleSend(preset.prompt)}
                className="w-56 sm:w-64 flex items-center gap-1.5 p-2 sm:p-2.5 rounded-xl bg-accent/15 border border-accent/30 text-[11px] sm:text-xs text-left hover:bg-accent/25 transition-colors cursor-pointer"
              >
                <preset.icon className="w-3 h-3 text-accent flex-shrink-0" />
                <span>{preset.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Input area — pinned at bottom of glass */}
        <div className="flex-shrink-0 px-3 sm:px-4 pb-3 sm:pb-4 pt-3 border-t border-border-subtle">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder={t('ai.placeholder')}
                className="flex-1 h-11 sm:h-10 text-xs sm:text-sm text-text-primary"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isTyping}
                className="h-11 w-11 sm:h-10 sm:w-10 p-0 rounded-lg bg-accent/25 text-white hover:bg-accent/35 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer border border-accent/40 flex items-center justify-center"
                aria-label={t('ai.send')}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[9px] sm:text-[10px] text-text-muted mt-1 text-center">
              {t('ai.disclaimer').split('. ').map((s, i, a) => (
                <span key={i} className="block sm:inline">
                  {s}{i < a.length - 1 ? '.' : ''}{i < a.length - 1 && <span className="hidden sm:inline"> </span>}
                </span>
              ))}
            </p>
        </div>

      </div>
    </div>
  );
}
