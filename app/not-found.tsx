import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-4 bg-stone-50 text-stone-900">
      <h2 className="text-xl font-bold mb-2">Страница не найдена (404)</h2>
      <p className="text-xs text-stone-500 mb-4">Запрашиваемая страница не существует.</p>
      <Link href="/" className="px-4 py-2 bg-amber-900 text-white rounded-xl text-xs font-semibold hover:bg-amber-800">
        Вернуться в «Кофейный сомелье»
      </Link>
    </div>
  );
}
