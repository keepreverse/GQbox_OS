import { useState, useEffect, useRef } from 'react';
import {
  Sparkles, FileText, Image, Languages, BarChart3,
  Send, Copy, Check, Brain, MessageSquare
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
    { 
      icon: FileText, 
      label: language === 'ru' ? 'Сгенерировать описание товара' : 'Generate Product Description', 
      prompt: language === 'ru' 
        ? 'Напиши продающее описание товара для сетевого зарядного устройства 20W PD с выходом USB-C, белого цвета, в премиальном алюминиевом корпусе'
        : 'Write a compelling product description for a 20W PD wall charger with USB-C output, white color, premium aluminum body' 
    },
    { 
      icon: Languages, 
      label: language === 'ru' ? 'Перевести на английский' : 'Translate to Russian', 
      prompt: language === 'ru'
        ? 'Переведи это название товара на английский язык: "Премиальный плетеный кабель USB-C — Lightning, 1 м, черный, 20 Вт PD"'
        : 'Translate this product title to Russian: "Premium Braided USB-C to Lightning Cable, 1m, Black, 20W PD"' 
    },
    { 
      icon: BarChart3, 
      label: language === 'ru' ? 'Проанализировать паттерн SKU' : 'Analyze SKU Pattern', 
      prompt: language === 'ru'
        ? 'Проанализируй структуру SKU S10002E-2/01 и объясни каждый сегмент'
        : 'Analyze the SKU pattern S10002E-2/01 and explain each segment' 
    },
    { 
      icon: Image, 
      label: language === 'ru' ? 'Промпт для генерации фото' : 'Generate Image Prompt', 
      prompt: language === 'ru'
        ? 'Создай детализированный промпт для нейросети для генерации студийной фотографии белой беспроводной зарядной станции 3-в-1'
        : 'Create a detailed AI image generation prompt for a product photo of a white wireless charging station' 
    },
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

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages]);

  // Инициализация приветственного сообщения с учетом текущего языка
  useEffect(() => {
    setMessages([
      { 
        id: '1', 
        role: 'assistant', 
        content: language === 'ru' 
          ? 'Добро пожаловать в AI Контент-хаб GQbox. Я могу помочь вам составить описания товаров, перевести тексты, проанализировать структуру SKU и создать маркетинговые материалы. Выберите быстрый запрос из списка или напишите свой вопрос ниже.'
          : 'Welcome to the GQbox AI Content Hub. I can help you generate product descriptions, translate content, analyze SKUs, and create marketing copy. Select a preset or type your request below.', 
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
    
    // Simulate AI response
    setTimeout(() => {
      const responses = language === 'ru' ? mockResponsesRu : mockResponsesEn;
      const defaultResponse = language === 'ru'
        ? `Я проанализировал ваш запрос: "${text.slice(0, 50)}...". Это демонстрационный ответ — в рабочей среде система свяжется с вашей нейросетью (OpenAI или Claude) через Supabase Edge Functions.`
        : `I've analyzed your request about "${text.slice(0, 50)}...". This is a placeholder response — in production, this would connect to your AI model (OpenAI, Claude, or local LLM) via Supabase Edge Functions.`;

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

  return (
    <div className="space-y-3 sm:space-y-4 h-[calc(100dvh_-_80px)] flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gradient">{t('ai.title')}</h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5 sm:mt-1">{t('ai.subtitle')}</p>
        </div>
        <div className="hidden sm:flex items-center gap-3 p-2 rounded-lg bg-bg-tertiary border border-border-subtle flex-shrink-0">
          <Brain className="w-3.5 h-3.5 text-accent" />
          <span className="text-[10px] text-text-secondary">GPT-4o</span>
        </div>
      </div>

      {/* Chat Area — fills remaining space */}
      <div className="flex-1 flex flex-col glass rounded-xl overflow-hidden min-h-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 sm:gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-6 sm:w-7 h-6 sm:h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === 'user'
                  ? 'bg-accent/25 border border-accent/40'
                  : 'bg-bg-elevated border border-border-subtle'
              }`}>
                {msg.role === 'user' ? (
                  <MessageSquare className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-white" />
                ) : (
                  <Sparkles className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-accent" />
                )}
              </div>
              <div className={`max-w-[85%] sm:max-w-[80%] ${msg.role === 'user' ? 'text-right' : ''}`}>
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
                      {copiedId === msg.id ? (language === 'ru' ? 'Скопировано' : 'Copied') : (language === 'ru' ? 'Копировать' : 'Copy')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Suggested prompts — as inline chips inside the chat */}
          {showSuggestions && (
            <div className="flex flex-wrap gap-2 pt-2">
              {presetPrompts.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handleSend(preset.prompt)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-bg-secondary border border-border-subtle text-[11px] sm:text-xs text-text-secondary hover:bg-bg-hover hover:text-text-primary hover:border-border-default transition-all cursor-pointer"
                >
                  <preset.icon className="w-3 h-3 text-accent flex-shrink-0" />
                  <span className="line-clamp-1">{preset.label}</span>
                </button>
              ))}
            </div>
          )}

          {isTyping && (
            <div className="flex gap-2 sm:gap-3">
              <div className="w-6 sm:w-7 h-6 sm:h-7 rounded-full bg-bg-elevated border border-border-subtle flex items-center justify-center">
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

        {/* Input — send button as sibling, not absolute */}
        <div className="p-3 sm:p-4 border-t border-border-subtle">
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
              aria-label={language === 'ru' ? 'Отправить' : 'Send'}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[9px] sm:text-[10px] text-text-muted mt-1.5 sm:mt-2 text-center">
            {language === 'ru' 
              ? 'Ответы генерируются для демонстрации. Подключите API ключи OpenAI/Claude для реальной работы.'
              : 'AI responses are generated for demonstration. Connect to OpenAI/Claude API for production use.'}
          </p>
        </div>
      </div>
    </div>
  );
}
