'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Coffee,
  Sliders,
  Calendar,
  Archive,
  Truck,
  Send,
  Package,
  RotateCcw,
  ArrowUpRight,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { CATEGORIES, CategoryItem, RecommendedProduct } from '@/lib/coffee-data';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  recommendedProduct?: RecommendedProduct | null;
  source?: string;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  selection: Coffee,
  grind: Sliders,
  subscription: Calendar,
  storage: Archive,
  delivery: Truck,
};

function formatMessageText(text: string) {
  const lines = text.split('\n');
  return lines.map((line, lineIdx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return <div key={lineIdx} className="h-2.5" />;
    }

    const parts = line.split(/(\*\*.*?\*\*)/g);
    return (
      <p key={lineIdx} className="leading-relaxed">
        {parts.map((part, partIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={partIdx} className="font-semibold text-[#1C1917]">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return <React.Fragment key={partIdx}>{part}</React.Fragment>;
        })}
      </p>
    );
  });
}

export default function CoffeeSommelierApp() {
  const [activeCategory, setActiveCategory] = useState<string>(CATEGORIES[0].id);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Здравствуйте! Я «Кофейный сомелье» обжарочной «Терруар».\n\nПомогу подобрать свежеобжаренный кофе под Ваши вкусовые предпочтения, выбрать помол под способ заваривания, настроить подписку или расскажу о правилах хранения и доставке.\n\nВыберите тему в списке слева или напишите Ваш вопрос в поле ввода.',
      source: 'из базы',
    },
  ]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<RecommendedProduct | null>(null);
  const [showDemoModal, setShowDemoModal] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isLoading]);

  const sendMessage = async (textToSend: string, categoryTitle?: string) => {
    const trimmed = textToSend.trim();
    if (isLoading) return;

    setErrorText(null);

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed || '(пустое сообщение)',
    };

    const currentHistory = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const currentCategoryObj = CATEGORIES.find((c) => c.id === activeCategory);
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: currentHistory,
          category: categoryTitle || currentCategoryObj?.title || 'Подбор сорта',
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Не удалось получить ответ от сервера.');
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        recommendedProduct: data.recommendedProduct || null,
        source: data.source || 'из базы',
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (data.recommendedProduct) {
        setSelectedProduct(data.recommendedProduct);
      }
    } catch (err) {
      setErrorText(
        err instanceof Error
          ? err.message
          : 'Произошла ошибка соединения. Попробуйте отправить сообщение ещё раз.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryClick = (cat: CategoryItem) => {
    setActiveCategory(cat.id);
    if (!isLoading) {
      sendMessage(cat.defaultPrompt, cat.title);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const currentCategoryTitle =
    CATEGORIES.find((c) => c.id === activeCategory)?.title || 'Подбор сорта';

  return (
    <main className="min-h-screen lg:h-screen w-full bg-[#FAF8F5] text-[#1C1917] flex flex-col lg:grid lg:grid-cols-[300px_1fr_360px] lg:overflow-hidden">
      {/* ЗОНА 1 (СЛЕВА): Список категорий */}
      <aside
        aria-label="Список категорий"
        className="w-full bg-[#EBE5D9] border-b lg:border-b-0 lg:border-r border-[#DDD6C8] flex flex-col justify-between p-6 lg:h-full"
      >
        <div>
          <div className="pb-6 mb-6 border-b border-[#DDD6C8]">
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-[#1C1917] whitespace-nowrap">
              Кофейный сомелье
            </h1>
            <p className="mt-1 text-xs text-[#78716C]">
              Обжарочная «Терруар» · Консультант
            </p>
          </div>

          <div className="mb-3">
            <h2 className="text-xs font-medium text-[#78716C] px-1">
              Категории вопросов
            </h2>
          </div>

          <nav className="flex flex-col gap-1.5" aria-label="Категории">
            {CATEGORIES.map((category) => {
              const Icon = CATEGORY_ICONS[category.id] || Coffee;
              const isActive = activeCategory === category.id;

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleCategoryClick(category)}
                  disabled={isLoading}
                  className={`w-full text-left px-3.5 py-3 rounded-lg transition-colors duration-150 flex items-start gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2C1E18] disabled:opacity-60 ${
                    isActive
                      ? 'bg-[#2C1E18] text-[#FAF8F5]'
                      : 'text-[#1C1917] hover:bg-[#DFD8CB]'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 mt-0.5 shrink-0 ${
                      isActive ? 'text-[#D6C7B2]' : 'text-[#78716C]'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium leading-snug truncate">
                      {category.title}
                    </div>
                    <div
                      className={`text-xs mt-0.5 truncate ${
                        isActive ? 'text-[#D6C7B2]' : 'text-[#78716C]'
                      }`}
                    >
                      {category.subtitle}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="hidden lg:block pt-6 border-t border-[#DDD6C8] text-xs text-[#78716C] leading-relaxed">
          Нажмите на категорию, чтобы начать подбор, или задайте свой вопрос в диалоге.
        </div>
      </aside>

      {/* ЗОНА 2 (ПО ЦЕНТРУ): Окно диалога */}
      <section
        aria-label="Окно диалога"
        className="flex flex-col bg-white min-h-[540px] lg:h-full lg:overflow-hidden"
      >
        <header className="px-6 py-4 border-b border-[#DDD6C8] bg-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2 text-sm text-[#57534E] min-w-0">
            <span className="font-semibold text-[#1C1917] truncate">
              Диалог с сомелье
            </span>
            <span aria-hidden="true" className="text-[#A8A29E]">
              ·
            </span>
            <span className="text-[#78716C] truncate">{currentCategoryTitle}</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div className="mb-1.5 px-1 text-xs">
                  {isUser ? (
                    <span className="font-medium text-[#78716C]">Ваш вопрос</span>
                  ) : (
                    <span className="font-medium text-[#78716C]">Ответ сомелье</span>
                  )}
                </div>

                {/* Сама плашка */}
                <div
                  className={`max-w-2xl rounded-2xl px-5 py-4 text-sm ${
                    isUser
                      ? 'bg-[#2C1E18] text-[#FAF8F5] shadow-sm'
                      : 'bg-white text-[#1C1917] border border-[#E5E0D5] shadow-sm'
                  }`}
                >
                  {isUser ? (
                    <p className="leading-relaxed text-[#FAF8F5]">{msg.content}</p>
                  ) : (
                    formatMessageText(msg.content)
                  )}

                  {msg.recommendedProduct && (
                    <div className="mt-4 pt-3 border-t border-[#E5E0D5] flex items-center justify-between gap-3">
                      <span className="text-xs text-[#78716C]">
                        Рекомендовано: {msg.recommendedProduct.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedProduct(msg.recommendedProduct || null)}
                        className="text-xs font-medium text-[#2C1E18] underline underline-offset-4 hover:text-[#57534E] transition-colors whitespace-nowrap shrink-0"
                      >
                        Показать в карточке
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex flex-col items-start">
              <div className="mb-1 px-1 text-xs text-[#78716C]">
                Кофейный сомелье
              </div>
              <div className="bg-white border border-[#DDD6C8] rounded-xl px-5 py-4 text-sm text-[#78716C]">
                Подбираю ответ по каталогу и базе обжарщика...
              </div>
            </div>
          )}

          {errorText && (
            <div
              role="alert"
              className="rounded-xl px-4 py-3 bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B]"
            >
              {errorText}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 lg:p-6 border-t border-[#DDD6C8] bg-white shrink-0">
          <form onSubmit={handleFormSubmit} className="flex items-center gap-3">
            <label htmlFor="sommelier-input" className="sr-only">
              Ваш вопрос кофейному сомелье
            </label>
            <input
              id="sommelier-input"
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Напишите вопрос о сорте, помоле, подписке или доставке..."
              disabled={isLoading}
              className="flex-1 min-w-0 h-11 px-4 rounded-lg bg-white border border-[#D6D1C7] text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#2C1E18] transition-colors disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="h-11 px-5 rounded-lg bg-[#2C1E18] text-[#FAF8F5] text-sm font-medium hover:bg-[#3E2B22] transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2C1E18] disabled:opacity-50"
            >
              <span>Отправить</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </section>

      {/* ЗОНА 3 (СПРАВА): Карточка товара */}
      <aside
        aria-label="Карточка товара"
        className="w-full bg-[#EBE5D9] border-t lg:border-t-0 lg:border-l border-[#DDD6C8] p-6 flex flex-col lg:h-full lg:overflow-y-auto"
      >
        <div className="pb-4 mb-6 border-b border-[#DDD6C8] flex items-center justify-between gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[#1C1917] whitespace-nowrap">
            Карточка товара
          </h2>
          {selectedProduct && (
            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
              className="text-xs text-[#78716C] hover:text-[#1C1917] flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
              title="Очистить карточку"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Очистить</span>
            </button>
          )}
        </div>

        <div className="bg-white border border-[#DDD6C8] rounded-xl p-5 flex-1 flex flex-col justify-between">
          {!selectedProduct ? (
            <div className="flex flex-col h-full justify-between">
              <div>
                <div className="w-full aspect-4/3 rounded-lg bg-[#FAF8F5] border border-dashed border-[#D6D1C7] flex flex-col items-center justify-center p-6 text-center">
                  <Package className="w-8 h-8 text-[#A8A29E] stroke-[1.5] mb-2" />
                  <p className="text-sm font-medium text-[#57534E]">
                    Карточка товара пуста
                  </p>
                  <p className="text-xs text-[#78716C] mt-1 max-w-[220px]">
                    Попросите сомелье подобрать кофе в диалоге, чтобы увидеть параметры сорта
                  </p>
                </div>

                <dl className="mt-6 space-y-4 text-sm">
                  <div className="pb-3 border-b border-[#F0EDE6]">
                    <dt className="text-xs text-[#78716C]">Название</dt>
                    <dd className="mt-1 font-medium text-[#A8A29E]">—</dd>
                  </div>
                  <div className="pb-3 border-b border-[#F0EDE6]">
                    <dt className="text-xs text-[#78716C]">Страна</dt>
                    <dd className="mt-1 text-[#A8A29E]">—</dd>
                  </div>
                  <div className="pb-3 border-b border-[#F0EDE6]">
                    <dt className="text-xs text-[#78716C]">Вкусовой профиль</dt>
                    <dd className="mt-1 text-[#A8A29E]">—</dd>
                  </div>
                  <div className="pb-3 border-b border-[#F0EDE6]">
                    <dt className="text-xs text-[#78716C]">Почему подходит</dt>
                    <dd className="mt-1 text-[#A8A29E]">—</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#78716C]">Цена</dt>
                    <dd className="mt-1 font-[family-name:var(--font-mono)] tabular-nums text-[#A8A29E]">
                      —
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="mt-6 pt-4 border-t border-[#F0EDE6]">
                <button
                  type="button"
                  disabled
                  className="w-full py-2.5 px-4 rounded-lg bg-[#FAF8F5] border border-[#DDD6C8] text-xs font-medium text-[#A8A29E] cursor-not-allowed whitespace-nowrap"
                >
                  Ссылка на товар недоступна
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full justify-between">
              <div>
                <div className="w-full aspect-4/3 rounded-lg bg-[#FAF8F5] border border-[#DDD6C8] flex flex-col items-center justify-center p-6 text-center">
                  <Coffee className="w-8 h-8 text-[#2C1E18] stroke-[1.5] mb-2" />
                  <p className="font-[family-name:var(--font-display)] text-lg font-bold text-[#1C1917]">
                    {selectedProduct.name}
                  </p>
                  <p className="text-xs text-[#78716C] mt-1">
                    Свежая обжарка · {selectedProduct.country}
                  </p>
                </div>

                <dl className="mt-6 space-y-4 text-sm">
                  <div className="pb-3 border-b border-[#F0EDE6]">
                    <dt className="text-xs text-[#78716C]">Название</dt>
                    <dd className="mt-1 font-semibold text-[#1C1917]">
                      {selectedProduct.name}
                    </dd>
                  </div>
                  <div className="pb-3 border-b border-[#F0EDE6]">
                    <dt className="text-xs text-[#78716C]">Страна</dt>
                    <dd className="mt-1 text-[#1C1917]">{selectedProduct.country}</dd>
                  </div>
                  <div className="pb-3 border-b border-[#F0EDE6]">
                    <dt className="text-xs text-[#78716C]">Вкусовой профиль</dt>
                    <dd className="mt-1 text-[#1C1917] leading-relaxed">
                      {selectedProduct.flavorProfile}
                    </dd>
                  </div>
                  <div className="pb-3 border-b border-[#F0EDE6]">
                    <dt className="text-xs text-[#78716C]">Почему подходит</dt>
                    <dd className="mt-1 text-[#1C1917] leading-relaxed">
                      {selectedProduct.whyFits}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#78716C]">Цена</dt>
                    <dd className="mt-1 font-[family-name:var(--font-mono)] tabular-nums font-semibold text-base text-[#1C1917]">
                      {selectedProduct.price}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="mt-6 pt-4 border-t border-[#F0EDE6]">
                <button
                  type="button"
                  onClick={() => setShowDemoModal(true)}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#2C1E18] text-[#FAF8F5] hover:bg-[#3E2B22] transition-colors text-xs font-medium flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <span>Перейти к товару</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {showDemoModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDemoModal(false)}
        >
          <div
            className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl border border-[#DDD6C8]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-[#1C1917] mb-2">
              Это демо-версия
            </h3>
            <p className="text-sm text-[#57534E] leading-relaxed mb-4">
              Ссылка на товар появится после подключения к реальному магазину. Сейчас это демонстрационный пример для учебного задания.
            </p>
            <button
              type="button"
              onClick={() => setShowDemoModal(false)}
              className="w-full py-2.5 px-4 rounded-lg bg-[#2C1E18] text-[#FAF8F5] hover:bg-[#3E2B22] transition-colors text-sm font-medium"
            >
              Понятно
            </button>
          </div>
        </div>
      )}
    </main>
  );
}