import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import {
  Sparkles, FileText, Image, Languages, BarChart3,
  Send, Copy, Check, Brain, User
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

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
    'Напиши продающее описание товара для сетевого зарядного устройства 20W PD с выходом USB-C, белого цвета, в премиальном алюминиевом корпусе': `Ощутите сверхскоростную зарядку с нашим сетевым адаптером 20W Power Delivery. Изготовленное из цельного алюминия с гладким белым покрытием, это компактное устройство обеспечивает оптимальную мощность для ваших девайсов через разъем USB-C. Идеально подходит для iPhone, iPad и любых других гаджетов. Оснащено технологией GaN для эффективной работы без перегрева.`,
    'Переведи это название товара на английский язык: "Премиальный плетеный кабель USB-C — Lightning, 1 м, черный, 20 Вт PD"': `Premium Braided USB-C to Lightning Cable, 1m, Black, 20W PD`,
    'Проанализируй структуру SKU S10002E-2/01 и объясни каждый сегмент': `Разбор артикула: S10002E-2/01

• S — Префикс бренда (GQbox)
• 10002 — Базовый номер товара (категория кабелей)
• E — Модификация модели (линейка ZS)
• -2 — Вариация длины (2 метра)
• /01 — Код цвета (Черный)

Этот SKU обозначает двухметровый черный кабель стандарта ZS.`,
    'Создай детализированный промпт для нейросети для генерации студийной фотографии белой беспроводной зарядной станции 3-в-1': `Professional product photography, white wireless charging station, 3-in-1 design, minimalist aesthetic, soft studio lighting, clean white background, Apple-style presentation, high detail, 8K quality, subtle shadows, premium materials visible, aluminum alloy body, Qi charging indicator light`,
  };

  const mockResponsesEn: Record<string, string> = {
    'Write a compelling product description for a 20W PD wall charger with USB-C output, white color, premium aluminum body': `Experience lightning-fast charging with our 20W Power Delivery wall adapter. Crafted from premium aluminum with a sleek white finish, this compact charger delivers optimal power to your devices via USB-C. Perfect for iPhone, iPad, and all USB-C devices. Features GaN technology for efficient, cool operation.`,
    'Translate this product title to Russian: "Premium Braided USB-C to Lightning Cable, 1m, Black, 20W PD"': `Премиальный плетеный кабель USB-C — Lightning, 1 м, черный, 20 Вт PD`,
    'Analyze the SKU pattern S10002E-2/01 and explain each segment': `SKU Breakdown: S10002E-2/01

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
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
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
    setIsTyping(true);

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
      setIsTyping(false);
    }, 1200);
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const showSuggestions = messages.length <= 1;
  const rootRef = useRef<HTMLDivElement>(null);
  const [rootHeight, setRootHeight] = useState('auto');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

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
        <div className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-4">
          <div className="space-y-3 sm:space-y-4">

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 sm:gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className="w-6 sm:w-7 h-6 sm:h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1 bg-bg-elevated border border-border-subtle">
                  {msg.role === 'user' ? (
                    <User className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-accent" />
                  ) : (
                    <Sparkles className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-accent" />
                  )}
                </div>
                <div className={`max-w-[85%] sm:max-w-[75%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block p-2.5 sm:p-3 rounded-xl text-xs sm:text-sm whitespace-pre-wrap text-left ${
                    msg.role === 'user'
                      ? 'bg-accent/15 border border-accent/30 text-text-primary'
                      : 'bg-bg-tertiary border border-border-subtle text-text-primary'
                  }`}>
                    {msg.content}
                  </div>
                  <div className="flex items-center gap-2 mt-1 justify-start">
                    <span className="text-[9px] sm:text-[10px] text-text-muted">{msg.timestamp}</span>
                    {msg.role === 'assistant' && (
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="text-[9px] sm:text-[10px] text-text-muted hover:bg-bg-hover hover:text-text-secondary flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        {copiedId === msg.id ? <Check className="w-2.5 sm:w-3 h-2.5 sm:h-3" /> : <Copy className="w-2.5 sm:w-3 h-2.5 sm:h-3" />}
                        {copiedId === msg.id ? t('ai.copied') : t('ai.copy')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex gap-2 sm:gap-3">
                <div className="w-6 sm:w-7 h-6 sm:h-7 rounded-full bg-bg-elevated border border-border-subtle flex items-center justify-center mt-1">
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
            <div ref={messagesEndRef} />
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
            <p className="text-[9px] sm:text-[10px] text-text-muted mt-1.5 sm:mt-2 text-center">{t('ai.disclaimer')}</p>
        </div>

      </div>
    </div>
  );
}
